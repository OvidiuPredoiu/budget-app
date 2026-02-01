# Buget Personal - Personal Budgeting App

O aplicație modernă de management al bugetului personal construită cu Node.js, TypeScript, Next.js și Prisma.

## 🚀 Stack Tehnologic

### Backend
- **Node.js** + **TypeScript** + **Express** - Server API REST
- **Prisma** - ORM pentru baza de date
- **SQLite** - Bază de date locală
- **argon2** - Hash-uire securizată a parolelor
- **JWT** - Autentificare cu access și refresh tokens
- **Zod** - Validare schema

### Frontend
- **Next.js 14** (App Router) - Framework React
- **TypeScript** - Type safety
- **shadcn/ui** + **Tailwind CSS** - Componente UI moderne
- **Recharts** - Vizualizări și grafice
- **Axios** - Client HTTP

## 📋 Funcționalități

### Autentificare
- ✅ Înregistrare cu email + parolă
- ✅ Conectare cu JWT (access + refresh tokens)
- ✅ Deconectare
- ✅ Hash-uire sigură cu argon2

### Managementul Categoriilor
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Personalizare culoare
- ✅ Interfață intuitivă

### Bugete Lunare
- ✅ Setare bugete pe categorie și lună
- ✅ Vizualizare bugete per lună
- ✅ Comparare buget vs actual

### Tranzacții
- ✅ Adăugare tranzacții (venituri/cheltuieli/transferuri)
- ✅ Detalii complete: dată, sumă, categorie, metodă plată (card/numerar)
- ✅ Tip card (debit/credit/virtual)
- ✅ Comerciant și note opționale
- ✅ Filtrare pe lună
- ✅ Editare și ștergere

### Dashboard
- ✅ KPI-uri: venituri totale, cheltuieli totale, bilanț net
- ✅ Top 3 categorii de cheltuieli
- ✅ Grafic pie - cheltuieli pe categorie
- ✅ Grafic linie - tendință cheltuieli zilnice
- ✅ Grafic bar - buget vs actual per categorie
- ✅ Selector de lună

## 📁 Structura Proiectului

```
buget/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema bază de date
│   │   │   └── seed.ts         # Date de test
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts     # Middleware autentificare
│   │   │   │   └── errorHandler.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts     # Endpoint-uri autentificare
│   │   │   │   ├── categories.ts
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   └── dashboard.ts
│   │   │   └── index.ts        # Server Express
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── web/                    # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx      # Layout autentificat
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── transactions/page.tsx
│       │   │   │   ├── budgets/page.tsx
│       │   │   │   └── categories/page.tsx
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── globals.css
│       │   ├── components/ui/  # Componente shadcn/ui
│       │   └── lib/
│       │       ├── api.ts      # Client API cu interceptori
│       │       └── utils.ts    # Funcții utilitate
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       ├── next.config.js
│       └── .env.local.example
│
├── package.json               # Root package.json (monorepo)
└── README.md
```

## 🛠️ Instalare și Configurare

### Prerequisite
- **Node.js** v18+ și npm
- **Git**

### Pasul 1: Clonare și Instalare Dependențe

```bash
# Instalare dependențe pentru API
cd apps/api
npm install

# Instalare dependențe pentru Web
cd ../web
npm install
```

### Pasul 2: Configurare Variabile de Mediu

#### Backend (apps/api/.env)
```bash
cd apps/api
cp .env.example .env
```

Editați `.env`:
```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
```

**⚠️ IMPORTANT:** Schimbați secret-urile JWT în producție!

#### Frontend (apps/web/.env.local)
```bash
cd apps/web
cp .env.local.example .env.local
```

Conținut `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Pasul 3: Configurare Bază de Date

```bash
cd apps/api

# Generare client Prisma și creare bază de date
npx prisma migrate dev --name init

# (Opțional) Populare cu date de test
npm run db:seed
```

Date de test:
- **Email:** test@example.com
- **Parolă:** password123

### Pasul 4: Rulare Aplicație

#### Opțiunea 1: Rulare Manuală (2 terminale)

**Terminal 1 - Backend:**
```bash
cd apps/api
npm run dev
```
Backend va rula pe: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```
Frontend va rula pe: http://localhost:3000

#### Opțiunea 2: Folosind scripturile root (din folderul principal)

```bash
# Terminal 1 - Backend
npm run dev:api

# Terminal 2 - Frontend
npm run dev:web
```

### Pasul 5: Accesare Aplicație

Deschideți browser-ul la: **http://localhost:3000**

- Conectați-vă cu: `test@example.com` / `password123` (dacă ați rulat seed)
- Sau înregistrați un cont nou

## 📊 API Endpoints

### Autentificare
- `POST /auth/register` - Înregistrare utilizator nou
- `POST /auth/login` - Conectare
- `POST /auth/refresh` - Reîmprospătare access token
- `POST /auth/logout` - Deconectare

### Categorii
- `GET /categories` - Lista toate categoriile
- `GET /categories/:id` - Detalii categorie
- `POST /categories` - Creare categorie
- `PUT /categories/:id` - Actualizare categorie
- `DELETE /categories/:id` - Ștergere categorie

### Bugete
- `GET /budgets?month=YYYY-MM` - Lista bugete (filtru opțional)
- `GET /budgets/:id` - Detalii buget
- `POST /budgets` - Creare buget
- `PUT /budgets/:id` - Actualizare buget
- `DELETE /budgets/:id` - Ștergere buget

### Tranzacții
- `GET /transactions?month=YYYY-MM` - Lista tranzacții (filtru opțional)
- `GET /transactions/:id` - Detalii tranzacție
- `POST /transactions` - Creare tranzacție
- `PUT /transactions/:id` - Actualizare tranzacție
- `DELETE /transactions/:id` - Ștergere tranzacție

### Dashboard
- `GET /dashboard?month=YYYY-MM` - Date agregate pentru dashboard

**Toate endpoint-urile (除 /auth/register și /auth/login) necesită autentificare cu Bearer token.**

## 🔒 Autentificare

Aplicația folosește JWT cu access și refresh tokens:

1. La conectare, primești ambele token-uri
2. Access token (valabilitate: 15 min) - folosit pentru cereri API
3. Refresh token (valabilitate: 7 zile) - folosit pentru reîmprospătare

Frontend-ul gestionează automat reîmprospătarea token-ului expirat.

## 🗄️ Schema Bazei de Date

### User
- id, email (unique), password (hash), name, timestamps

### RefreshToken
- id, token (unique), userId, expiresAt, createdAt

### Category
- id, name, color (optional), userId, timestamps

### Budget
- id, month (YYYY-MM), amount, categoryId, userId, timestamps
- Constraint: unique(userId, categoryId, month)

### Transaction
- id, date, amount, type (income/expense/transfer)
- paymentMethod (card/cash), cardType (debit/credit/virtual)
- merchant, note, categoryId, userId, timestamps

## 🧪 Testare

### Verificare Backend
```bash
# Testare health check
curl http://localhost:3001/health

# Înregistrare
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test123","name":"Test User"}'
```

### Prisma Studio (interfață grafică bază de date)
```bash
cd apps/api
npm run db:studio
```
Se va deschide pe: http://localhost:5555

## 📝 Comenzi Utile

```bash
# Backend
cd apps/api
npm run dev          # Rulare development cu hot reload
npm run build        # Build producție
npm start            # Rulare producție
npm run db:migrate   # Rulare migrații Prisma
npm run db:studio    # Deschidere Prisma Studio
npm run db:seed      # Populare date de test

# Frontend
cd apps/web
npm run dev          # Rulare development
npm run build        # Build producție
npm start            # Rulare producție
npm run lint         # Verificare erori ESLint
```

## 🎨 Personalizare

### Culori Theme (apps/web/src/app/globals.css)
Modificați variabilele CSS pentru a schimba tema:
```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... etc */
}
```

### Moneda
Aplicația folosește **RON (Lei românești)**. Pentru schimbarea monedei, editați `apps/web/src/lib/utils.ts`:
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON'  // Schimbați aici (EUR, USD, etc.)
  }).format(amount);
}
```

## 🐛 Depanare

### Eroare "Port already in use"
```bash
# Linux/Mac - găsire proces pe port
lsof -i :3001
kill -9 <PID>

# Sau schimbați portul în .env (Backend) sau rulați pe alt port
```

### Eroare Prisma "Database is locked"
```bash
cd apps/api
rm -f prisma/dev.db*
npx prisma migrate dev
npm run db:seed
```

### Frontend nu se conectează la API
- Verificați că backend-ul rulează pe portul corect (3001)
- Verificați `NEXT_PUBLIC_API_URL` în `apps/web/.env.local`
- Verificați console-ul browser pentru erori CORS

## 📦 Build Producție

```bash
# Backend
cd apps/api
npm run build
npm start

# Frontend
cd apps/web
npm run build
npm start
```

## 🔮 Extensii Viitoare

Idei pentru îmbunătățiri:
- [ ] Export/import date (CSV, JSON)
- [ ] Rapoarte PDF
- [ ] Notificări email pentru bugete depășite
- [ ] Categorii partajate între utilizatori (familie)
- [ ] Grafice suplimentare (trend lunar, comparații an-la-an)
- [ ] Aplicație mobilă (React Native)
- [ ] Suport multi-valută
- [ ] Integrare bancară automată
- [ ] Dark mode
- [ ] Backup automat cloud

## 📄 Licență

MIT

## 👤 Autor

Buget Personal - Aplicație demonstrativă pentru management buget

---

**Happy Budgeting! 💰📊**
