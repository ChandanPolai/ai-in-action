# AI in Action — LMS

MERN stack Learning Management System for the **AI in Action** course.

## Structure

```
AI-IN-ACTION/
├── ai-action-backend/    # Express + MongoDB API
├── ai-action-admin/      # Admin Panel (React + Vite) → port 3000
├── ai-action-frontend/   # User / Student Panel (React + Vite) → port 3001
└── COMING-SOON/          # Reference architecture
```

Architecture mirrors **COMING-SOON**: JWT role auth, `{ status, message, data }` responses, POST-first APIs, Redux Toolkit, Layout + URL-tab routing, Vite builds into backend SPA folders.

## Theme

White & blue Tailwind design system (`brand-500: #2563eb`), Plus Jakarta Sans, fully mobile responsive.

## Prerequisites

- Node.js 18+
- MongoDB running locally (or update `MONGO_URI`)

## Setup

### 1. Backend

```bash
cd ai-action-backend
cp .env.example .env   # or use existing .env
npm install
npm run dev            # http://localhost:5000
```

Default admin (auto-seeded):
- Email: `admin@gmail.com`
- Password: `123456`

### 2. Admin Panel

```bash
cd ai-action-admin
npm install
npm run dev            # http://localhost:3000
```

### 3. User Panel

```bash
cd ai-action-frontend
npm install
npm run dev            # http://localhost:3001
```

## Features

### Admin
- Secure login / logout (JWT + bcrypt)
- User CRUD, activate/deactivate, reset password, email credentials
- Dashboard stats (users, meetings, attendance)
- Meeting scheduling (date, time, Zoom link, day/session, assign users)
- Attendance view & filters (date, user, meeting)
- Session recordings + **explicit video access control** (present does NOT auto-grant access)
- Future-ready Notification model (email / WhatsApp)

### User
- Login, profile, change password
- View assigned meetings (day-wise)
- Join Zoom → marks **Present**
- Attendance history
- Watch only permitted recordings

## API Overview

| Prefix | Role |
|--------|------|
| `/api/admin/*` | Admin JWT (`admintoken`) |
| `/api/user/*` | User JWT (`usertoken`) |

## Production build

```bash
cd ai-action-backend
npm run build:all
npm start
```

Serves **User** at `/userapp/` and **Admin** at `/adminapp/` (same pattern).
