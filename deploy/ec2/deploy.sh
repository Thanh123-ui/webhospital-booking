#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/webhospital-booking}"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"
PM2_APP_NAME="${PM2_APP_NAME:-webhospital-backend}"
BRANCH="${BRANCH:-main}"

echo "[deploy] App root: $APP_ROOT"
echo "[deploy] Branch: $BRANCH"

if [ ! -d "$APP_ROOT/.git" ]; then
  echo "[deploy] Khong tim thay repo git tai $APP_ROOT"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "[deploy] Thieu file $BACKEND_DIR/.env"
  echo "[deploy] Hay tao .env tu backend/.env.example truoc khi deploy"
  exit 1
fi

cd "$APP_ROOT"

echo "[deploy] Lay code moi nhat..."
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] Cai dependencies backend..."
cd "$BACKEND_DIR"
npm ci

echo "[deploy] Cai dependencies frontend..."
cd "$FRONTEND_DIR"
npm ci

echo "[deploy] Build frontend..."
npm run build

echo "[deploy] Khoi dong lai backend bang pm2..."
cd "$BACKEND_DIR"

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start server.js --name "$PM2_APP_NAME"
fi

pm2 save

echo "[deploy] Hoan tat."
echo "[deploy] Nho cau hinh Nginx/CloudFront tro frontend toi $FRONTEND_DIR/dist va proxy /api, /socket.io ve backend."
