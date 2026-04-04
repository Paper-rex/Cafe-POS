# ☕ Café POS

A production-grade, full-stack Restaurant Point-of-Sale system with role-based dashboards (Admin, Waiter, Kitchen, Cashier), realtime SSE updates, and UPI/Cash/Card payments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + CSS custom properties |
| State | Zustand + React Query |
| Animation | Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database | Prisma + PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Realtime | Server-Sent Events (SSE) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# 3. Setup database
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 4. Run development servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

### Default Login
- **Email**: admin@cafepos.local
- **Password**: Admin@123

## Project Structure

```
cafe-POS/
├── backend/
│   ├── prisma/          # Schema + migrations + seed
│   ├── src/
│   │   ├── lib/         # Prisma client, JWT, mailer, constants
│   │   ├── middleware/   # Auth, role, session guards
│   │   ├── routes/      # Express route handlers
│   │   ├── services/    # Business logic (SSE, payments, sessions)
│   │   └── types/       # TypeScript type extensions
│   └── uploads/         # Product images
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # UI + shared components
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # API client, formatters, query config
│       ├── pages/       # Route pages by role
│       ├── store/       # Zustand stores
│       └── types/       # Shared TypeScript types
└── package.json         # Monorepo workspace root
```

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full dashboard, staff management, products, floors, sessions, reports |
| **Waiter** | Floor view, order creation, payment initiation |
| **Kitchen** | Order queue (Kanban board), status updates |
| **Cashier** | Payment confirmation, cash handling, history |
