# Buget Personal - Quick Start Guide

## 🎯 You're All Set!

Your personal budgeting application is **fully configured and ready to use**.

### 🔐 NEW: Sistem de Permisiuni

Am adăugat o **interfață completă de gestionare a permisiunilor** pentru administratori.

#### Rapidă Instrucțiune:
1. Login ca admin
2. Merge la **Admin → Permisiuni**
3. Selectează un user
4. Dezactiveaza/activeaza feature-uri cu toggle buttons
5. Schimbările se salvează automat

[Vezi PERMISSIONS_GUIDE.md pentru detalii complete]

## 📂 What's Been Created

```
buget/
├── 📄 README.md                    # Complete documentation
├── 📄 PROJECT_SUMMARY.md           # Project overview
├── 📄 QUICK_START.md               # This file
├── 📄 PERMISSIONS_GUIDE.md         # [NEW] Permissions system guide
├── 📄 ARCHITECTURE.md              # [NEW] System architecture
├── 📄 IMPLEMENTATION_SUMMARY.md     # [NEW] What was implemented
├── 🚀 start.sh                     # Quick setup script
├── 🧪 test-permissions.sh          # [NEW] API testing script
├── 📦 package.json                 # Monorepo config
│
├── apps/api/                       # Backend API
│   ├── 🗄️  prisma/
│   │   ├── schema.prisma          # Database schema (✨ updated with UserPermissions)
│   │   ├── dev.db                 # SQLite database (✅ created)
│   │   ├── seed.ts                # Sample data script
│   │   └── migrations/            # Database migrations
│   │       └── 20260131181923_add_user_permissions/  # [NEW] Migration
│   ├── 📂 src/
│   │   ├── index.ts               # Express server
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── adminAuth.ts
│   │   │   └── checkPermission.ts  # [NEW] Permission validation
│   │   └── routes/                # API endpoints
│   │       ├── admin.ts           # [UPDATED] Added permission endpoints
│   │       ├── transactions.ts    # [UPDATED] Added permission checks
│   │       ├── categories.ts      # [UPDATED] Added permission checks
│   │       └── dashboard.ts       # [UPDATED] Added permission checks
│   ├── .env                       # Config (✅ created)
│   └── node_modules/              # Dependencies (✅ installed)
│
└── apps/web/                       # Frontend
    ├── 📂 src/
    │   ├── lib/
    │   │   ├── api.ts
    │   │   ├── permissions.ts     # [NEW] Permission helpers
    │   │   └── utils.ts
    │   ├── components/
    │   │   ├── ui/                # UI components
    │   │   └── PermissionGuard.tsx # [NEW] Permission guard component
    │   └── app/
    │       ├── (dashboard)/
    │       │   ├── admin/
    │       │   │   └── page.tsx   # [UPDATED] Added Permissions tab
    │       │   └── ...
    │       ├── layout.tsx
    │       └── page.tsx
    └── package.json
```
    │   ├── app/                   # Next.js pages
    │   │   ├── (dashboard)/       # Protected pages
    │   │   │   ├── dashboard/
    │   │   │   ├── transactions/
    │   │   │   ├── budgets/
    │   │   │   └── categories/
    │   │   ├── login/
    │   │   └── register/
    │   ├── components/ui/         # shadcn/ui components
    │   └── lib/                   # Utilities & API client
    ├── .env.local                 # Config (✅ created)
    └── node_modules/              # Dependencies (✅ installed)
```

## 🚀 How to Start

### Option 1: Two Terminals (Recommended)

**Terminal 1 - Start Backend:**
```bash
cd ~/apps/buget
npm run dev:api
```
Wait for: `Server running on port 3001`

**Terminal 2 - Start Frontend:**
```bash
cd ~/apps/buget
npm run dev:web
```
Wait for: `Ready on http://localhost:3000`

### Option 2: Direct Commands

```bash
# Backend
cd ~/apps/buget/apps/api && npm run dev

# Frontend (in another terminal)
cd ~/apps/buget/apps/web && npm run dev
```

## 🌐 Access the App

Once both servers are running:

1. **Open browser:** http://localhost:3000
2. **Login with test account:**
   - Email: `test@example.com`
   - Password: `password123`
3. **Or create a new account** via the Register link

## ✨ What You Can Do

### 📊 Dashboard
- View total income, expenses, and net balance
- See spending breakdown by category (pie chart)
- Track daily spending trends (line chart)
- Compare budgets vs actual spending (bar chart)
- View top 3 spending categories

### 💰 Transactions
- Add income, expenses, or transfers
- Track payment method (card/cash)
- Specify card type (debit/credit/virtual)
- Add merchant names and notes
- Filter by month
- Edit or delete transactions

### 🎯 Budgets
- Set monthly budgets for each category
- View budgets across different months
- Track spending against budgets
- Edit or delete budgets

### 🏷️ Categories
- Create custom categories
- Assign colors for visual distinction
- Edit or delete categories
- View all transactions per category

## 🗄️ Sample Data

The database has been seeded with:
- ✅ 1 test user account
- ✅ 8 Romanian categories (Alimente, Transport, Utilități, Distracție, Sănătate, Educație, Salariu, Economii)
- ✅ 5 budgets for the current month (January 2026)
- ✅ 16 sample transactions with Romanian merchants

## 🔧 Useful Commands

```bash
# Backend
npm run dev:api          # Start API dev server
cd apps/api && npm run db:studio    # Open Prisma Studio (DB GUI)
cd apps/api && npm run db:seed      # Re-seed database

# Frontend
npm run dev:web          # Start web dev server
cd apps/web && npm run build        # Build for production

# Both
npm run build:api        # Build API
npm run build:web        # Build web
```

## 🎨 Tech Stack at a Glance

**Backend:**
- Node.js + TypeScript + Express
- Prisma ORM + SQLite
- JWT authentication (access + refresh tokens)
- Zod validation

**Frontend:**
- Next.js 14 (App Router)
- shadcn/ui + Tailwind CSS
- Recharts for data visualization
- Axios for API calls

## 📱 Pages & Routes

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | User authentication |
| Register | `/register` | New account creation |
| Dashboard | `/dashboard` | Analytics & charts |
| Transactions | `/transactions` | Manage transactions |
| Budgets | `/budgets` | Monthly budget planning |
| Categories | `/categories` | Category management |

## 🔒 API Endpoints

All authenticated with JWT Bearer token:

- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /categories` - List categories
- `POST /categories` - Create category
- `GET /budgets?month=YYYY-MM` - List budgets
- `POST /budgets` - Create budget
- `GET /transactions?month=YYYY-MM` - List transactions
- `POST /transactions` - Create transaction
- `GET /dashboard?month=YYYY-MM` - Dashboard data

## 🐛 Troubleshooting

**Backend won't start:**
```bash
cd apps/api
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

**Frontend won't start:**
```bash
cd apps/web
rm -rf node_modules package-lock.json .next
npm install
```

**Database issues:**
```bash
cd apps/api
rm -f prisma/dev.db*
npx prisma migrate dev
npm run db:seed
```

**Port already in use:**
Change port in `apps/api/.env` (default: 3001)

## 📚 Documentation

- [README.md](README.md) - Complete setup & usage guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Technical overview
- API endpoints documented in README
- Database schema in `apps/api/prisma/schema.prisma`

## 🎉 You're Ready!

Everything is set up and ready to use. Just start both servers and enjoy your personal budgeting app!

**Happy budgeting! 💰📊**

---

💡 **Tip:** Keep both terminal windows visible to see real-time logs from backend and frontend.
