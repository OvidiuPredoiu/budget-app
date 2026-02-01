# Arhitectura Sistem Permisiuni

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMINISTRATOR                             │
│                      (Admin Dashboard)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Permissions Tab                                         │   │
│  │  ┌─────────────────┐      ┌──────────────────────────┐  │   │
│  │  │ Users List      │      │ Permissions Editor      │  │   │
│  │  │                 │      │                          │  │   │
│  │  │ • John Doe      │──→   │ Dashboard  ✓ (Always)   │  │   │
│  │  │ • Jane Smith    │      │ Transactions ✓ (Always) │  │   │
│  │  │ • Bob Wilson    │      │ Categories ✓ (Always)   │  │   │
│  │  │ • Alice Jones   │      │                          │  │   │
│  │  │                 │      │ Budgets [◯] Toggle      │  │   │
│  │  │ [Search...]     │      │ Recurring [◉] Toggle    │  │   │
│  │  └─────────────────┘      │ Goals [◯] Toggle        │  │   │
│  │                           │ Investments [◉] Toggle  │  │   │
│  │                           │ ... (12 more)           │  │   │
│  │                           └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                │                                  │
│                           PATCH request                           │
│                      (Toggle permissions)                         │
└────────────┬──────────────────┼───────────────────────────────────┘
             │                  │
             │                  ▼
        ┌────┴──────────────────────────────────┐
        │     API Backend (Express.js)          │
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │ Admin Routes                    │ │
        │  │                                 │ │
        │  │ GET    /admin/permissions/all   │ │
        │  │ GET    /admin/users/:id/perm    │ │
        │  │ PATCH  /admin/users/:id/perm    │ │
        │  └─────────────────────────────────┘ │
        │                │                      │
        │                ▼                      │
        │  ┌─────────────────────────────────┐ │
        │  │ Protected Routes                │ │
        │  │ (hasPermission checks)          │ │
        │  │                                 │ │
        │  │ GET    /dashboard               │ │
        │  │ GET    /transactions            │ │
        │  │ POST   /transactions            │ │
        │  │ GET    /categories              │ │
        │  │ POST   /categories              │ │
        │  └─────────────────────────────────┘ │
        │                │                      │
        │                ▼                      │
        │  ┌─────────────────────────────────┐ │
        │  │ Permission Check Middleware     │ │
        │  │                                 │ │
        │  │ if (user.role === 'admin')      │ │
        │  │   → Allow all                   │ │
        │  │                                 │ │
        │  │ if (hasPermission(userId,      │ │
        │  │       feature))                 │ │
        │  │   → Allow                       │ │
        │  │ else                            │ │
        │  │   → Return 403 Forbidden        │ │
        │  └─────────────────────────────────┘ │
        └────────────┬──────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────┐
        │      Database (Prisma)              │
        │                                     │
        │  ┌─────────────────────────────────┐│
        │  │ users                           ││
        │  │ ├─ id                           ││
        │  │ ├─ email                        ││
        │  │ ├─ role (user/admin)            ││
        │  │ └─ ...                          ││
        │  └─────────────────────────────────┘│
        │                                     │
        │  ┌─────────────────────────────────┐│
        │  │ user_permissions                ││
        │  │ ├─ userId (FK → users)          ││
        │  │ ├─ dashboard (bool)  ✓ Always   ││
        │  │ ├─ transactions (bool) ✓ Always ││
        │  │ ├─ categories (bool)  ✓ Always  ││
        │  │ ├─ budgets (bool)     [toggle]  ││
        │  │ ├─ recurring (bool)    [toggle] ││
        │  │ ├─ goals (bool)        [toggle] ││
        │  │ ├─ investments (bool)  [toggle] ││
        │  │ ├─ subscriptions (bool)[toggle] ││
        │  │ ├─ receipts (bool)     [toggle] ││
        │  │ ├─ reports (bool)      [toggle] ││
        │  │ ├─ insights (bool)     [toggle] ││
        │  │ ├─ predictions (bool)  [toggle] ││
        │  │ ├─ banking (bool)      [toggle] ││
        │  │ ├─ sharedBudgets(bool) [toggle] ││
        │  │ ├─ analytics (bool)    [toggle] ││
        │  │ ├─ tax (bool)          [toggle] ││
        │  │ └─ whiteLabel (bool)   [toggle] ││
        │  └─────────────────────────────────┘│
        └─────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                        REGULAR USER                               │
│                    (Frontend App)                                 │
│                                                                   │
│  Frontend Components Protected by Permissions                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PermissionGuard Wrapper                                   │  │
│  │                                                             │  │
│  │  <PermissionGuard feature="budgets">                        │  │
│  │    ├─ ✓ ALLOWED: Render <BudgetsPage />                   │  │
│  │    └─ ✗ DENIED: Show "Feature not available" message       │  │
│  │  </PermissionGuard>                                         │  │
│  │                                                             │  │
│  │  API Calls with Permission Checks                           │  │
│  │  ├─ GET /transactions → Permission check on backend        │  │
│  │  ├─ GET /dashboard → Permission check on backend           │  │
│  │  └─ GET /categories → Permission check on backend          │  │
│  │                                                             │  │
│  │  Client-Side Cache (5 min)                                  │  │
│  │  └─ Reduce API calls for permission checks                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Navigation/Menu Items Conditionally Rendered                     │
│  ├─ Dashboard (always visible)                                    │
│  ├─ Transactions (always visible)                                 │
│  ├─ Categories (always visible)                                   │
│  ├─ Budgets (if permitted)                                        │
│  ├─ Investments (if permitted)                                    │
│  ├─ Reports (if permitted)                                        │
│  └─ ... (conditional on permissions)                              │
└──────────────────────────────────────────────────────────────────┘

Flow: 
1. Admin selects user and toggles features
2. Changes saved to database
3. User logs in / next request
4. Frontend fetches permissions (cached)
5. PermissionGuard or API validation determines access
6. ✓ Feature accessible or ✗ Feature hidden/protected
```

## Nivele de Control

### 1. Database Level
- `UserPermissions` table stores booleans for each feature
- Automatic creation on user signup
- Enforced foreign key to User (cascade delete)

### 2. API Level (Backend)
- Route handlers check `hasPermission()` before processing
- Admin users bypass all checks
- Returns 403 Forbidden for denied requests

### 3. Frontend Level
- `PermissionGuard` component wrapper
- `hasPermission()` function for conditional logic
- Client-side cache reduces server calls
- UI elements hidden if not permitted

### 4. Audit Level
- Admin log tracks all permission changes
- Timestamp and admin user recorded
- Trail for compliance/debugging

## Data Flow Diagrams

### Create/Update Permission Flow
```
Admin Toggle
    │
    ▼
Frontend State Update
    │
    ▼
PATCH /admin/users/:id/permissions
    │
    ▼
Backend Handler
    │
    ├─ Authenticate
    ├─ Authorize (must be admin)
    ├─ Validate input
    └─ Protect basic features (always true)
    │
    ▼
Prisma Update
    │
    ▼
Database Write
    │
    ▼
Audit Log Create
    │
    ▼
Response: Updated UserPermissions
    │
    ▼
Frontend Update UI
    │
    ▼
Invalidate Cache
```

### Access Request Flow
```
User Request
    │
    ├─ GET /transactions
    │   ├─ Authenticate (JWT)
    │   ├─ Check Admin?
    │   │   ├─ Yes → Allow
    │   │   └─ No → hasPermission('transactions')
    │   │       ├─ Yes → Return data
    │   │       └─ No → 403 Forbidden
    │   └─ Send Response
    │
    └─ Frontend Component
        ├─ Mount
        ├─ Check hasPermission()
        │   ├─ Cache valid?
        │   │   ├─ Yes → Use cached value
        │   │   └─ No → Fetch from API
        │   ├─ Allowed?
        │   │   ├─ Yes → Render Component
        │   │   └─ No → Show Fallback
        └─ Done
```
