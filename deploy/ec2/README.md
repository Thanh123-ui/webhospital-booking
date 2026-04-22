# EC2 Deploy Notes

## Muc dich
- `deploy.sh`: script deploy thu cong tren EC2
- Chua tu dong chay. Ban se SSH vao EC2 va goi script khi can.

## Chuan bi tren EC2
1. Clone repo vao mot thu muc co dinh, vi du:
   - `/var/www/webhospital-booking`
2. Cai san:
   - `node`
   - `npm`
   - `pm2`
   - `git`
   - `nginx`
3. Tao file secret that:
   - `backend/.env`

## Tao .env that
```bash
cd /var/www/webhospital-booking/backend
cp .env.example .env
nano .env
```

## Chay deploy
```bash
cd /var/www/webhospital-booking
bash deploy/ec2/deploy.sh
```

## Bien moi truong co the override
```bash
APP_ROOT=/var/www/webhospital-booking \
PM2_APP_NAME=webhospital-backend \
BRANCH=main \
bash deploy/ec2/deploy.sh
```

## Script nay lam gi
1. Kiem tra repo git ton tai
2. Kiem tra `backend/.env` da co chua
3. `git fetch` + `git pull`
4. `npm ci` cho backend
5. `npm ci` cho frontend
6. `npm run build` frontend
7. `pm2 restart` backend, neu chua co thi `pm2 start server.js`

## Khong nam trong script
- Tao file `.env`
- Cau hinh Nginx
- Cau hinh CloudFront
- Provision SSL
