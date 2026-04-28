#!/bin/bash
set -ex
exec > >(tee /var/log/user-data.log | logger -t user-data 2>/dev/console) 2>&1

APP_DIR="/opt/webhospital-booking"
APP_USER="ec2-user"

echo "=== [1/5] Install Docker & Git ==="
dnf update -y
dnf install -y git
# Cài đặt Docker trên Amazon Linux 2023
dnf install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker $APP_USER

# Cài đặt Docker Compose
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "=== [2/5] Clone repository ==="
rm -rf "$APP_DIR"
git clone --depth 1 https://github.com/Thanh123-ui/webhospital-booking.git "$APP_DIR"

echo "=== [3/5] Setup Environment Variables ==="
# Lưu ý: Thay đổi các biến này theo RDS của bạn nếu không dùng MySQL trong Docker
cat > "$APP_DIR/docker-test/.env" <<EOF_ENV
PORT=5000
NODE_ENV=production
# Nếu bạn dùng RDS, đổi DB_HOST thành endpoint của RDS và xoá service mysql trong docker-compose
DB_MODE=mysql
DB_HOST=mysql 
DB_PORT=3306
DB_NAME=hospital_booking
DB_USER=hospital_user
DB_PASSWORD=hospital_password
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://$(curl -s http://checkip.amazonaws.com)
EMAIL_PROVIDER=ses
EOF_ENV

echo "=== [4/5] Build and Run Docker ==="
cd "$APP_DIR/docker-test"
# Chạy toàn bộ Backend, Frontend (Nginx), và MySQL
docker-compose --env-file .env up --build -d

echo "=== [5/5] Done ==="
echo "Website is running on port 8080. Open http://<EC2_PUBLIC_IP>:8080"
