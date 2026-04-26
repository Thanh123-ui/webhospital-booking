# 🏥 Hospital Booking System

Hệ thống đặt lịch khám bệnh trực tuyến toàn diện — hỗ trợ bệnh nhân đặt lịch, bác sĩ quản lý ca khám, điều dưỡng ghi sinh hiệu, và quản trị viên điều phối toàn bộ quy trình.

---

## 🏗️ Kiến trúc hệ thống

```
                    ┌──────────────┐
                    │  CloudFront  │  (CDN + HTTPS)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     ALB      │  (Application Load Balancer)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   EC2 + ASG  │  (Node.js + Nginx)
                    │   (Backend)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼────┐
       │  RDS    │  │   SES   │  │  WAF v2  │
       │ (MySQL) │  │  (Mail) │  │(Security)│
       └─────────┘  └─────────┘  └──────────┘
```

---

## 📁 Cấu trúc dự án

```
webhospital-booking/
├── backend/                    # Node.js / Express REST API
│   ├── config/                 # Cấu hình env, database
│   ├── controllers/            # Logic xử lý request
│   ├── middleware/             # Auth, error handling
│   ├── routes/                 # Định nghĩa API endpoints
│   ├── services/               # Business logic (appointments, patients...)
│   ├── utils/                  # Email, logger, HTTP helpers
│   └── server.js
├── frontend/                   # React + Vite (Admin & Patient Portal)
│   └── src/
│       ├── pages/              # Các trang: Admin, Patient, Auth
│       ├── components/         # UI components tái sử dụng
│       └── api/                # Axios API client
├── mobile/                     # React Native / Expo (Mobile App)
│   └── app/
│       ├── (auth)/             # Đăng ký, Đăng nhập
│       └── (tabs)/             # Màn hình chính
├── database/
│   └── schema.sql              # Schema MySQL + Seed data
├── deploy/
│   └── ec2/
│       └── deploy.sh           # Script deploy lên EC2
├── user_data.sh                # Terraform EC2 bootstrap template
├── compute.tf                  # Terraform: EC2 + ASG
├── variables.tf                # Terraform: Biến cấu hình
├── locals.tf                   # Terraform: Local values
└── README.md
```

---

## 🚀 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend Web** | React 18, Vite, TailwindCSS |
| **Mobile** | React Native, Expo |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | MySQL 8 (AWS RDS) |
| **Auth** | JWT (Access + Refresh Token), bcryptjs |
| **Email** | AWS SES / Nodemailer (Ethereal test) |
| **Infrastructure** | AWS EC2, ALB, CloudFront, WAF, ASG |
| **IaC** | Terraform |

---

## ⚡ Cài đặt & Chạy local

### Yêu cầu
- Node.js >= 20
- MySQL 8 (local) hoặc kết nối RDS

### 1. Clone repo
```bash
git clone https://github.com/Thanh123-ui/webhospital-booking.git
cd webhospital-booking
```

### 2. Cấu hình Backend
```bash
cp backend/.env.example backend/.env
# Chỉnh sửa backend/.env với thông tin DB của bạn
```

### 3. Khởi tạo Database
```bash
mysql -u root -p < database/schema.sql
```

### 4. Chạy Backend & Frontend
```bash
# Chạy Backend
npm run dev:backend

# Chạy Frontend (terminal khác)
npm run dev:frontend
```

> Truy cập Frontend: http://localhost:5173  
> API Backend: http://localhost:5000

---

## 📧 Cấu hình Email

| Mode | Mô tả | Cấu hình |
|------|--------|-----------|
| `ethereal` | Test local, link preview trong console | Mặc định, không cần cấu hình |
| `ses` | Production, gửi mail thật | Cần AWS SES credentials |

Xem chi tiết: `backend/.env.example`

---

## 🔑 Tài khoản test (Seed data)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `123` |
| BOD | `bod` | `123` |
| Lễ tân | `reception` | `123` |
| Bác sĩ Tim mạch | `bstim` | `bstim@2024` |
| Điều dưỡng | `nurse` | `123` |

---

## ☁️ Deploy lên AWS

Infrastructure được quản lý bằng Terraform. Xem `variables.tf` để biết các biến cần cấu hình trước khi `terraform apply`.

```bash
terraform init
terraform plan
terraform apply
```
