#!/bin/bash

set -ex
exec > >(tee /var/log/user-data.log | logger -t user-data 2>/dev/console) 2>&1

APP_DIR="/opt/webhospital-booking"
APP_USER="ec2-user"
# Backend chạy nội bộ port 5000 (không expose ra ngoài)
# nginx lắng nghe app_port (${app_port}) để ALB Target Group health-check pass
BACKEND_PORT=5000

echo "=== [1/9] Update OS and install packages ==="
dnf update -y

dnf install -y git mariadb105 nginx

# Sau đó mới cài Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

echo "=== [2/9] Prepare application directory ==="
rm -rf "$${APP_DIR}"
mkdir -p "$${APP_DIR}"

echo "=== [3/9] Clone GitHub repo ==="
git clone --depth 1 "${github_repo_url}" "$${APP_DIR}" || exit 1
chown -R "$${APP_USER}:$${APP_USER}" "$${APP_DIR}"

echo "=== [4/9] Create backend/.env ==="
cat > "$${APP_DIR}/backend/.env" <<EOF_ENV
PORT=$${BACKEND_PORT}
DB_MODE=mysql
DB_HOST=${db_host}
DB_PORT=${db_port}
DB_NAME=${db_name}
DB_USER=${db_username}
DB_PASSWORD=${db_password}
SESSION_SECRET=lab-secret-$(openssl rand -hex 16)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Thanh2004
EOF_ENV

chown "$${APP_USER}:$${APP_USER}" "$${APP_DIR}/backend/.env"
chmod 600 "$${APP_DIR}/backend/.env"

echo "=== [5/9] Install backend dependencies ==="
runuser -u "$${APP_USER}" -- bash -lc "
  cd '$${APP_DIR}/backend'
  npm install --production
" || exit 1

echo "=== [5b/9] Install frontend dependencies and build ==="
# VITE_API_URL để trống = gọi relative URL (/api/...) → nginx proxy về backend
runuser -u "$${APP_USER}" -- bash -lc "
  cd '$${APP_DIR}/frontend'
  npm install
  npm run build
" || exit 1

echo "=== [6/9] Configure nginx ==="
# nginx port ${app_port} (ALB Target Group trỏ vào đây)
#  → /api/*      proxy → backend :$${BACKEND_PORT}
#  → /socket.io/ proxy → backend :$${BACKEND_PORT} (WebSocket upgrade)
#  → /health     trả 200 cho ALB health check
#  → /           serve frontend/dist (SPA fallback index.html)
cat > /etc/nginx/conf.d/hospital.conf <<NGINX_CONF
server {
    listen ${app_port};
    server_name _;

    root $${APP_DIR}/frontend/dist;
    index index.html;

    # ALB health check endpoint
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # REST API → backend
    location /api/ {
        proxy_pass http://127.0.0.1:$${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Socket.IO → backend (cần Upgrade WebSocket)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
    }

    # React SPA — fallback về index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Gzip để tăng tốc frontend
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_comp_level 5;
}
NGINX_CONF

# Xóa config mặc định tránh conflict và kiểm tra syntax
rm -f /etc/nginx/conf.d/default.conf
nginx -t || { echo "ERROR: nginx config invalid!"; exit 1; }
systemctl enable nginx
systemctl restart nginx

echo "=== [7/9] Set up wait-for-rds script ==="
cat > /usr/local/bin/wait-for-rds.sh <<'EOF_WAIT'
#!/bin/bash
set -euo pipefail

ENV_FILE="/opt/webhospital-booking/backend/.env"
[ -f "$ENV_FILE" ] || { echo "ERROR: $ENV_FILE not found"; exit 1; }
set -a; source "$ENV_FILE"; set +a

ATTEMPTS=60
for ((i=1; i<=ATTEMPTS; i++)); do
  if MYSQL_PWD="$DB_PASSWORD" mysql \
      --protocol=tcp --connect-timeout=5 \
      -h "$DB_HOST" -P "$DB_PORT" \
      -u "$DB_USER" -D "$DB_NAME" \
      -e "SELECT 1;" >/dev/null 2>&1; then
    echo "RDS is ready after $i attempt(s)."
    exit 0
  fi
  echo "[$i/$ATTEMPTS] Waiting for RDS at $DB_HOST:$DB_PORT ..."
  sleep 10
done

echo "ERROR: RDS not ready after $ATTEMPTS attempts."
exit 1
EOF_WAIT
chmod +x /usr/local/bin/wait-for-rds.sh

echo "=== [8/9] Create systemd service for backend ==="
cat > /etc/systemd/system/webhospital-booking.service <<EOF_SERVICE
[Unit]
Description=Hospital Booking - Node.js Backend
Documentation=https://github.com/Thanh123-ui/webhospital-booking
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
User=$${APP_USER}
WorkingDirectory=$${APP_DIR}/backend
EnvironmentFile=$${APP_DIR}/backend/.env
ExecStartPre=/usr/local/bin/wait-for-rds.sh
ExecStart=/usr/bin/node $${APP_DIR}/backend/server.js
Restart=always
RestartSec=10
# Giới hạn tài nguyên phòng memory leak
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF_SERVICE

echo "=== [9/9] Enable and start backend service ==="
systemctl daemon-reload
systemctl enable webhospital-booking.service
systemctl start webhospital-booking.service

# Chờ backend khởi động xong rồi reload nginx
sleep 5
systemctl reload nginx || true

echo ""
echo "======================================================="
echo "  Bootstrap COMPLETED"
echo "======================================================="
echo "  ALB URL     : http://<ALB-DNS-name>/"
echo "  API Base    : http://<ALB-DNS-name>/api/"
echo "  Backend     : port $${BACKEND_PORT} (noi bo, nginx proxy)"
echo ""
echo "  Kiem tra backend : systemctl status webhospital-booking"
echo "  Xem log backend  : journalctl -u webhospital-booking -f"
echo "  Kiem tra nginx   : systemctl status nginx"
echo "  Log boot         : cat /var/log/user-data.log"
echo "======================================================="
