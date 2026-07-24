# SurfSync Studio

AI-powered sales CRM platform. This repo currently includes the **Superadmin** portal.

## Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MySQL 8

## Setup

### 1. Configure MySQL password

Edit `backend/.env`:

```
DB_PASSWORD=your_actual_mysql_root_password
```

### 2. Create database + seed superadmin

```bash
cd backend
npm run setup
```

### 3. Start API

```bash
cd backend
npm run dev
```

### 4. Start frontend

```bash
cd frontend
npm run dev
```

Open the Vite URL (usually http://localhost:5173).

## Superadmin login

- Email: `admin@surfsync.studio`
- Password: `Admin@123`

## Superadmin can

- View platform overview (MRR, revenue, companies)
- Create / manage companies and assign plans
- Create subscription plans
- Record payments and track revenue
