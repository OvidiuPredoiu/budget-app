# 📱 Buget Personal - Rezumat Complet

Cuprins:
- [1. Rezumat Non-Tehnic (Pentru Utilizatori)](#rezumat-non-tehnic)
- [2. Rezumat Tehnic (Pentru Dezvoltatori)](#rezumat-tehnic)

---

# 💰 Rezumat Non-Tehnic (Pentru Utilizatori Obișnuiți)

## Ce Este Buget Personal?

Aceasta este o **aplicație de management financiar personal** - gândește-te la ea ca la un **caiet/jurnal digital pentru bani**.

---

## 🎯 Ce Poți Face?

### 1. Înregistrare și Conectare 🔑
- Creezi un cont cu email și parolă
- Te conectezi din orice moment
- Datele tale sunt protejate și private

---

### 2. Tabloul de Bord (Dashboard) 📊
Când intri în aplicație, vezi o pagină cu:
- **Cât ai câștigat** (venituri totale)
- **Cât ai cheltuit** (cheltuieli totale)
- **Banii pe care îi mai ai** (diferența)
- **Grafice vizuale** care arată unde s-au dus banii tăi
- **Top 3 categorii** în care ai cheltuit cel mai mult

Poți selecta o lună și vezi datele doar pentru acea lună.

---

### 3. Categorii de Cheltuieli 📂
Îți poți organiza cheltuielile în categorii, cum ar fi:
- Mâncare
- Transport
- Utilități (apă, gaz, electricitate)
- Cumpărături
- Divertisment
- etc.

Poți **crea categorii noi**, le poți **colora** cum îți place și le poți **șterge** dacă nu le mai folosești.

---

### 4. Adăugare Tranzacții 💳
Poți să înregistrezi fiecare tranzacție cu:
- **Ce tip**: Venit, Cheltuială sau Transfer
- **Suma**: Cât e banii
- **Data**: Când a fost
- **Categoria**: În ce categorie se încadrează
- **De unde/cum**: Card, Numerar, Transfer bancar
- **Unde**: Ce magazin/cine (comerciant)
- **Note**: Detalii suplimentare dacă vrei

Toate tranzacțiile se arată într-o listă frumoasă și poți să le **editezi** sau **ștergi** dacă te-ai greșit.

---

### 5. Planificare Bugete Lunare 💰
Pentru fiecare categorie, poți **stabili o limită de cheltuieli pe lună**:
- "Vreau să cheltuiesc maxim 500 lei pe mâncare luna asta"
- "Vreau să nu depășesc 200 lei pe divertisment"

Aplicația **te urmărește** și îți arată dacă stai pe buget sau dacă ai depășit.

---

### 6. Caracteristici Premium (dacă sunt activate pentru tine) ⭐

#### Bugete Partajate 👥
Dacă locuiești cu cineva, puteți **partaja un buget comun** pentru:
- Chirie
- Mâncare comună
- Electric
- etc.

Fiecare vede ce cheltuie cealaltă persoană.

#### Obiective de Economii 🎯
Setezi un țel financiar (ex: "Vreau 10,000 lei pentru vacanță") și aplicația te ajută să vezi cum avansezi.

#### Tranzacții Recurente 🔄
Pentru bani care se repetă (salariu lunar, chirie, abonament Netflix):
- Le setezi o dată
- Aplicația le creează automat în fiecare lună

#### Rapoarte Detaliate 📈
Poți vedea **rapoarte lunare/anuale** cu:
- Cât ai câștigat/cheltuit
- Unde s-au dus cei mai mulți bani
- Tendințe în timp

#### Abonamente 📱
Poți vedea **toți banii pe care îi dai pentru abonamente** (Netflix, Spotify, etc.) și să fii alertat când se apropie renovarea.

#### Chitanțe 🧾
Poți **încărca poze cu chitanțe** și să le legi de tranzacțiile tale.

#### Servicii Bancare 🏦
Aplicația se poate conecta cu banca ta și **importa automat tranzacții**.

#### Analitici și Predicții 🔮
Primești **sugestii inteligente** bazate pe obiceiurile tale de cheltuieli.

#### Rapoarte Fiscale 🧾
Dacă ești freelancer/PFA, poți genera rapoarte de impozite.

---

### 👨‍💼 Dacă Ești Administrator

Poți **gestiona accesul altor utilizatori** - deciding care funcții sunt disponibile pentru fiecare persoană.

---

### 🎨 Design și Accesibilitate

- ✅ Interfață în **limba română**
- ✅ Monedă în **RON (Lei)**
- ✅ Funcționează pe **calculator și telefon**
- ✅ Grafice **frumoase și ușor de înțeles**
- ✅ Design **modern și intuitiv**

---

### 📝 Rezumat - Ce Rezolvi cu Această Aplicație?

| Problemă | Soluția |
|----------|---------|
| Nu știu unde merg banii | Dashboard cu grafice arată exact |
| Vreau să economisesc | Setezi bugete și ți se arată dacă le depășești |
| Uităm tranzacțiile | Fiecare se înregistrează și rămâne salvată |
| Vreau să plănific | Poți seta obiective și bugete |
| Nu înțeleg cheltuielile | Rapoarte detaliate și analize |
| Doresc să colaborez cu cineva | Bugete partajate |

---

### 🚀 În Practică - Un Exemplu Tipic

1. Te **conectezi** în aplicație
2. Vezi **Dashboard-ul** cu rezumat financiar
3. Adaugi o **tranzacție** - ai cumpărat pâine cu 10 lei
4. Adaugi o **cheltuie** - spital 150 lei
5. Adaugi un **venit** - salariu 2000 lei
6. **Graficele se actualizează** automat
7. Vezi **bugetele tale** pentru luna asta
8. Primești **sugestii** cum poți economisi mai mult

**Gata!** Banii tăi sunt organizați și înțelegi exact ce se întâmplă cu ei. 💰✨

---

---

# 📊 Rezumat Tehnic (Pentru Dezvoltatori)

## 🏗️ Arhitectura Tehnică

### Backend (API - Node.js + Express + TypeScript)
- Server Express rulând pe port 3001
- Bază de date SQLite cu Prisma ORM
- Autentificare JWT cu access și refresh tokens
- Validare pe toate endpoint-urile cu Zod

### Frontend (Next.js 14 + TypeScript)
- Server Next.js pe port 3000 cu App Router
- UI moderne cu shadcn/ui și Tailwind CSS
- Client API cu Axios și interceptori
- Responsive design pentru desktop/mobile

---

## 📋 Funcționalități Principale (17 Module)

### 1️⃣ AUTENTIFICARE 
- ✅ Înregistrare cu email + parolă (hash argon2)
- ✅ Conectare cu JWT tokens (access: 15min, refresh: 7 zile)
- ✅ Deconectare și revocarea tokenilor
- ✅ Refresh token automat la expirare

### 2️⃣ DASHBOARD 📊
- ✅ KPI-uri: Venituri totale, Cheltuieli totale, Bilanț net
- ✅ Grafic pie - Cheltuieli pe categorie
- ✅ Grafic linie - Tendință cheltuieli zilnice
- ✅ Grafic bar - Buget vs Actual per categorie
- ✅ Top 3 categorii de cheltuieli
- ✅ Selector de lună pentru filtrare

### 3️⃣ TRANZACȚII 💳
- ✅ Adăugare/editare/ștergere tranzacții
- ✅ Tipuri: Venituri, Cheltuieli, Transferuri
- ✅ Metode de plată: Card, Numerar, Transfer bancar
- ✅ Tipuri de carduri: Debit, Credit, Virtual
- ✅ Detalii complete: Data, Sumă, Categorie, Comerciant, Note
- ✅ Filtrare pe lună
- ✅ Dată și ora tranzacției

### 4️⃣ CATEGORII 📂
- ✅ CRUD complet (Creare, Citire, Actualizare, Ștergere)
- ✅ Personalizare culoare pentru fiecare categorie
- ✅ Afișare în grid/card layout
- ✅ Asociare cu tranzacții și bugete

### 5️⃣ BUGETE LUNARE 💰
- ✅ Setare bugete pe categorie și lună
- ✅ Vizualizare bugete per lună
- ✅ Comparare buget planificat vs real
- ✅ Tracking cheltuieli vs limita stabilită
- ✅ Alertă vizuală când se depășește bugetul

### 6️⃣ PERMISIUNI 🔐
**3 Permisiuni de Bază (Permanente):**
- Dashboard, Transactions, Categories

**14 Funcționalități Opționale (Configurabile):**
- Budgets, Recurring, Goals, Investments
- Subscriptions, Receipts, Reports, Insights
- Predictions, Banking, Shared Budgets, Analytics
- Tax, White Label

**Admin Panel:**
- Manage utilizatori și activează/dezactivează funcții
- Toggle buttons pentru fiecare feature
- Salvare automată a modificărilor

---

## 🎯 Funcționalități Suplimentare (Implementate)

### 7️⃣ ADMIN FEATURES 👨‍💼
- ✅ Management utilizatori
- ✅ Asignare/modificare permisiuni utilizatori
- ✅ Dashboard admin cu statistici globale
- ✅ Vizualizare toți utilizatorii sistemului

### 8️⃣ ANALIZE & RAPOARTE 📈
- ✅ Rapoarte detaliate pe perioade
- ✅ Insights automate bazate pe date
- ✅ Predicții de cheltuieli
- ✅ Analitică avansată

### 9️⃣ TRANZACȚII RECURENTE 🔄
- ✅ Setup tranzacții repetate (zilnic, săptămânal, lunar)
- ✅ Auto-creație tranzacții la dată stabilită
- ✅ Management tranzacții recurente

### 🔟 INVESTIȚII 💹
- ✅ Tracking portofoliu investiții
- ✅ Monitorizare randament
- ✅ Calculare profit/loss

---

## 🎯 Funcționalități Avansate Disponibile

### 1️⃣1️⃣ OBIECTIVE DE ECONOMII 🎯
- ✅ Setare obiective financiare
- ✅ Tracking progres spre țintă
- ✅ Sugestii de economii

### 1️⃣2️⃣ ABONAMENTE 📱
- ✅ Tracking abonamente recurring
- ✅ Alert pentru renovare
- ✅ Statistic costuri abonamente

### 1️⃣3️⃣ CHITANȚE 🧾
- ✅ Upload și storage chitanțe
- ✅ OCR pentru extragere date
- ✅ Link chitanțe cu tranzacții

### 1️⃣4️⃣ SERVICII BANCARE 🏦
- ✅ Integrare cu bănci (API banking)
- ✅ Import tranzacții automat
- ✅ Sincronizare conturi multiple

### 1️⃣5️⃣ BUGETE PARTAJATE 👥
- ✅ Share bugete cu alți utilizatori
- ✅ Colaborare pe cheltuieli comune
- ✅ Notificări pentru componență

### 1️⃣6️⃣ IMPOZITE 🧾
- ✅ Calcul impozite
- ✅ Deduceri fiscale
- ✅ Rapoarte fiscale

### 1️⃣7️⃣ WHITE LABEL 🎨
- ✅ Branding personalizat
- ✅ Teme personalizate
- ✅ Subdomenii custom

---

## 🗄️ Schema Database (Prisma)

```
Users
├─ id, email, password (hash), role (user/admin)
├─ createdAt, updatedAt

Categories
├─ id, userId, name, color, icon
├─ Relation: User → Categories (1-Many)

Budgets
├─ id, userId, categoryId, month, amount
├─ Constraint: Unic (userId + categoryId + month)

Transactions
├─ id, userId, categoryId, date, amount
├─ type (income/expense/transfer)
├─ paymentMethod, cardType, merchant, notes

UserPermissions
├─ userId (FK)
├─ dashboard, transactions, categories (3 bază)
├─ budgets, recurring, goals, investments...
├─ (14 permisiuni opționale)

RefreshTokens
├─ id, userId, token, expiresAt
├─ Pentru revocarea tokenilor
```

---

## 💻 Cum Funcționează?

1. **Utilizatorul se înregistrează** → Creare cont + permisiuni default
2. **Se conectează** → Primește JWT tokens (access + refresh)
3. **Vede Dashboard** → KPI-uri și grafice, întotdeauna disponibil
4. **Adaugă categorii** → Personalizează culori
5. **Setează bugete** → Planifică cheltuieli
6. **Înregistrează tranzacții** → Dashboard se actualizează automat
7. **Primește rapoarte** → Dacă are permisiune
8. **Admin** poate activa/dezactiva funcții per utilizator

---

## ✨ Puncte Forte

✅ **Securitate**: argon2 hashing, JWT tokens, validare Zod  
✅ **Scalabilitate**: Sistem de permisiuni flexibil  
✅ **UX**: Interfață în limba română, RON currency  
✅ **Architectură**: Monorepo, separare concerns, type-safe  
✅ **Database**: Prisma ORM, migrations, cascade deletes  
✅ **API**: RESTful, validare input, error handling  

---

## 🚀 Concluzie

Buget Personal este o aplicație **production-ready** cu:
- 17 module integrate
- Sistem avansat de permisiuni
- Interfață modernă și intuitivă
- Securitate de nivel enterprise
- Support complet pentru limba și valuta română

Perfect pentru gestionarea finanțelor personale! 💰✨
