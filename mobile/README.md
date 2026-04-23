# Hospital Mobile

App mobile benh nhan duoc tach rieng trong thu muc `mobile/`, dung chung backend hien co.

## Chay local

1. Chay backend:

```bash
cd backend
npm install
npm run dev
```

2. Tao env cho mobile:

```bash
cd mobile
cp .env.example .env
```

3. Sua `EXPO_PUBLIC_API_URL` theo moi truong test:

- iOS Simulator: `http://localhost:5000/api`
- Android Emulator: `http://10.0.2.2:5000/api`
- Dien thoai that: `http://<LAN_IP_MAY_DEV>:5000/api`

4. Cai dependency va chay Expo:

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npm run start
```

Neu vua doi SDK Expo, can xoa bo dependency cu truoc khi `npm install` de tranh giu lai package cua SDK truoc do.

## Scope hien tai

- Dang nhap / dang ky / quen mat khau OTP cho benh nhan
- Trang chu benh nhan
- Dat lich kham
- Ho so benh nhan

Khong co dashboard admin trong app mobile nay.
