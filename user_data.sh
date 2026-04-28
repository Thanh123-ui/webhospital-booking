#!/bin/bash

set -ex
exec > >(tee /var/log/user-data.log | logger -t user-data 2>/dev/console) 2>&1

APP_DIR="/opt/webhospital-booking"
APP_USER="ec2-user"
# Backend chạy nội bộ port 5001 (không expose trực tiếp ra ngoài Internet)
# nginx lắng nghe app_port (${app_port}) để ALB Target Group health-check pass
# Ví dụ:
# - app_port = 3000  -> ALB trỏ vào nginx:3000
# - backend port 5001 -> chỉ nginx proxy nội bộ tới
BACKEND_PORT=5001

echo "=== [1/9] Update OS and install packages ==="
dnf update -y
dnf install -y git mariadb105 nginx openssl

# Cài Node.js 20 từ NodeSource (Vite 8 yêu cầu Node >= 20)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

echo "=== [2/9] Prepare application directory ==="
rm -rf "$${APP_DIR}"
mkdir -p "$${APP_DIR}"

echo "=== [3/9] Clone GitHub repo ==="
git clone --depth 1 "${github_repo_url}" "$${APP_DIR}" || exit 1
chown -R "$${APP_USER}:$${APP_USER}" "$${APP_DIR}"

echo "=== [4/9] Create backend/.env ==="
# Quan trong:
# - CORS_ORIGIN phai la origin ma trinh duyet nguoi dung thuc su dung.
# - Neu di qua CloudFront/custom domain, hay truyen domain CloudFront/custom domain tai day.
# - ALB -> EC2 la server-to-server, khong phai browser origin.
CORS_ORIGIN_VALUE="${cors_origin}"
if [ -z "$${CORS_ORIGIN_VALUE}" ]; then
  CORS_ORIGIN_VALUE="http://localhost:5173,http://127.0.0.1:5173"
fi

PATIENT_RESET_OTP_LENGTH_VALUE=6
PATIENT_RESET_OTP_TTL_SECONDS_VALUE=300
PATIENT_RESET_OTP_RESEND_SECONDS_VALUE=60
PATIENT_RESET_OTP_PREVIEW_VALUE=true
AWS_REGION_VALUE=""
AWS_SNS_SENDER_ID_VALUE=""
EMAIL_PROVIDER_VALUE="${email_provider}"
AWS_SES_REGION_VALUE="${ses_region}"
EMAIL_FROM_VALUE="${email_from}"

cat > "$${APP_DIR}/backend/.env" <<EOF_ENV
PORT=$${BACKEND_PORT}
NODE_ENV=production
DB_MODE=mysql
DB_HOST=${db_host}
DB_PORT=${db_port}
DB_NAME=${db_name}
DB_USER=${db_username}
DB_PASSWORD=${db_password}
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=$${CORS_ORIGIN_VALUE}
PATIENT_RESET_OTP_LENGTH=$${PATIENT_RESET_OTP_LENGTH_VALUE}
PATIENT_RESET_OTP_TTL_SECONDS=$${PATIENT_RESET_OTP_TTL_SECONDS_VALUE}
PATIENT_RESET_OTP_RESEND_SECONDS=$${PATIENT_RESET_OTP_RESEND_SECONDS_VALUE}
PATIENT_RESET_OTP_PREVIEW=$${PATIENT_RESET_OTP_PREVIEW_VALUE}
AWS_REGION=$${AWS_REGION_VALUE}
AWS_SNS_SENDER_ID=$${AWS_SNS_SENDER_ID_VALUE}
EMAIL_PROVIDER=$${EMAIL_PROVIDER_VALUE}
AWS_SES_REGION=$${AWS_SES_REGION_VALUE}
EMAIL_FROM=$${EMAIL_FROM_VALUE}
EOF_ENV

chown "$${APP_USER}:$${APP_USER}" "$${APP_DIR}/backend/.env"
chmod 600 "$${APP_DIR}/backend/.env"

echo "=== [5/9] Install backend dependencies ==="
runuser -u "$${APP_USER}" -- bash -lc "
  cd '$${APP_DIR}/backend'
  if [ -f package-lock.json ]; then
    npm ci --omit=dev || npm install --omit=dev
  else
    npm install --omit=dev
  fi
" || exit 1

echo "=== [5b/9] Build frontend ==="
# VITE_API_URL để trống = gọi relative URL (/api/...) → nginx proxy về backend
runuser -u "$${APP_USER}" -- bash -lc "
  cd '$${APP_DIR}/frontend'
  if [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
  printf 'VITE_API_URL=/api\nVITE_SOCKET_URL=\n' > .env.production
  npm run build
" || exit 1

echo "=== [6/9] Configure nginx ==="
# nginx port ${app_port} (ALB Target Group trỏ vào đây, ví dụ 3000)
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
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
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