# Sistem de Permisiuni - Documentație

## Prezentare Generală

Am implementat un sistem complet de permisiuni care permite administratorilor să activeze/dezactiveze funcționalități pentru utilizatori.

## Componente Principale

### 1. Database Model (`UserPermissions`)
- **Locație**: `apps/api/prisma/schema.prisma`
- **Tabel**: `UserPermissions` - stochează permisiunile pentru fiecare utilizator
- **Funcționalități de bază** (întotdeauna active):
  - `dashboard` - Tabloul de Bord
  - `transactions` - Tranzacții
  - `categories` - Categorii
  
- **Funcționalități suplimentare** (configurable):
  - `budgets` - Bugete
  - `recurring` - Tranzacții Recurente
  - `goals` - Obiective de Economii
  - `investments` - Investiții
  - `subscriptions` - Abonamente
  - `receipts` - Chitanțe
  - `reports` - Rapoarte
  - `insights` - Analize
  - `predictions` - Predicții
  - `banking` - Servicii Bancare
  - `sharedBudgets` - Bugete Partajate
  - `analytics` - Analitică
  - `tax` - Impozite
  - `whiteLabel` - White Label

### 2. API Endpoints

#### Admin Routes (`/admin`)

**Obține permisiuni pentru utilizator:**
```
GET /admin/users/:userId/permissions
```

**Actualizează permisiuni pentru utilizator:**
```
PATCH /admin/users/:userId/permissions
Content-Type: application/json

{
  "budgets": true,
  "recurring": false,
  "goals": true,
  ...
}
```

**Obține toți utilizatorii cu permisiuni:**
```
GET /admin/permissions/all
```

### 3. Backend - Verificarea Permisiunilor

**Locație**: `apps/api/src/middleware/checkPermission.ts`

Funcții helper:
- `hasPermission(userId, feature)` - Verifică dacă un utilizator are o permisiune
- `getUserPermissions(userId)` - Obține permisiunile unui utilizator

**Integrare în rute:**
```typescript
import { hasPermission } from '../middleware/checkPermission';

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'transactions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // ... rest of handler
  } catch (error) {
    next(error);
  }
});
```

**Rute cu verificare de permisiuni:**
- Dashboard (`/dashboard`) - `dashboard`
- Transactions (`/transactions`) - `transactions`
- Categories (`/categories`) - `categories`

### 4. Frontend - Gestionarea Permisiunilor

**Locație**: `apps/web/src/lib/permissions.ts`

Funcții:
- `getUserPermissions()` - Obține permisiunile utilizatorului curent (cu caching)
- `hasPermission(feature)` - Verifică dacă utilizatorul are o permisiune
- `invalidatePermissionCache()` - Golește cache-ul de permisiuni

**Utilizare în componente:**
```typescript
import { hasPermission } from '@/lib/permissions';

const allowed = await hasPermission('transactions');
if (!allowed) {
  // Afişează mesaj de acces refuzat
}
```

### 5. Frontend - Componentă PermissionGuard

**Locație**: `apps/web/src/components/PermissionGuard.tsx`

Componentă React pentru a proteja secțiuni de UI:

```tsx
import { PermissionGuard } from '@/components/PermissionGuard';

export default function TransactionsPage() {
  return (
    <PermissionGuard feature="transactions">
      <YourTransactionsComponent />
    </PermissionGuard>
  );
}
```

Cu fallback custom:
```tsx
<PermissionGuard 
  feature="investments"
  fallback={<div>Contactați admin pentru acces la investiții</div>}
>
  <InvestmentsComponent />
</PermissionGuard>
```

### 6. Pagina Admin - Tab Permisiuni

**Locație**: `apps/web/src/app/(dashboard)/admin/page.tsx`

**Funcționalități:**
1. Vedere seznam cu toți utilizatorii
2. Selectare utilizator pentru a vedea/edita permisiuni
3. Toggle buttons pentru fiecare funcționalitate
4. Permisiunile de bază sunt întotdeauna marcate ca active
5. Actualizare automată pe server la modificări

## Flow-ul Aplicației

### 1. Crearea Utilizatorului
Când se creează un utilizator nou, sistemul crează automat o înregistrare `UserPermissions` cu toate opțiunile activate.

### 2. Administrare Permisiuni
1. Admin merge în panoul Admin → tab "Permisiuni"
2. Selectează un utilizator din listă
3. Vede starea permisiunilor
4. Poate activa/dezactiva funcționalități (cu excepția celor de bază)
5. Schimbările se salvează automat pe server

### 3. Verificare Permisiuni
- **Pe backend**: Fiecare rută critică verifică permisiunile
- **Pe frontend**: Componentele folosesc `PermissionGuard` sau `hasPermission()`
- **Admin users**: Au acces la toate funcționalitățile

## Exemplu Complet

### Setup pe Backend

1. Adaugă verificare în rută existentă:
```typescript
router.get('/budgets', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Verifică permisiune
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Budgets feature not available' });
      }
    }
    
    // ... restul logicii
  } catch (error) {
    next(error);
  }
});
```

### Setup pe Frontend

1. Protejează pagină cu PermissionGuard:
```tsx
export default function BudgetsPage() {
  return (
    <PermissionGuard feature="budgets">
      <BudgetsContent />
    </PermissionGuard>
  );
}
```

2. Sau verifyuri în handler:
```typescript
async function loadBudgets() {
  const allowed = await hasPermission('budgets');
  if (!allowed) {
    alert('Funcționalitate nu disponibilă');
    return;
  }
  // ... load budgets
}
```

## Noțiuni Importante

1. **Permisiunile de bază sunt protejate**: Nu pot fi dezactivate din admin (dashboard, transactions, categories)
2. **Auto-creație permisiuni**: Dacă nu există, se creează automat cu valori default
3. **Admin bypass**: Administratorii au acces la toate funcționalitățile
4. **Cache frontend**: Permisiunile sunt cached 5 minute pentru performanță
5. **Audit logging**: Schimbările de permisiuni sunt înregistrate în audit log

## Testare

### Testează API manual:
```bash
# Obține permisiuni
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/admin/users/USER_ID/permissions

# Actualizează permisiuni
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budgets": false, "investments": true}' \
  http://localhost:3001/admin/users/USER_ID/permissions
```

### Testează Frontend:
1. Login ca admin
2. Merge la Admin → Permisiuni
3. Selectează un utilizator
4. Dezactivează o funcționalitate
5. Verifyă că utilizatorul nu mai poate accesa feature-ul
