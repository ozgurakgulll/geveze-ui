# Geveze UI — Mock Veri vs Gerçek API Durum Analizi

> Güncelleme: 2026-06-26  
> Amaç: Her bileşende hangi verinin mock, hangisinin gerçek API'dan geldiğini netleştirmek

---

## TL;DR

| Kategori | Durum | Aciliyet |
|----------|-------|----------|
| Tasks (CRUD + Bulk + Archive + Soft Delete) | ✅ Gerçek API | — |
| Users (CRUD + Permissions + Role) | ✅ Gerçek API | — |
| Portfolio (CRUD) | ✅ Gerçek API | — |
| Tags & Service Types | ✅ Gerçek API | — |
| Auth (Login) | ✅ Gerçek API | — |
| **TableView → users import** | ❌ MOCK | 🔴 Kritik |
| **Sidebar/Header → currentProject** | ❌ MOCK | 🔴 Kritik |
| **UI Constants (priorityColors vs.)** | ⚠️ mockData'dan import | 🟡 Orta |
| **Settings** | ❌ API mevcut ama UI bağlı değil | 🟡 Orta |
| **TaskCommentsPanel** | ❌ Sahte veriler üretiyor | 🟠 Önemli |
| **PersonView: online/last seen** | ❌ seededRandom() | 🟡 Orta |
| **Portfolio nested updates** | ❌ Endpoint yok | 🟠 Önemli |

---

## 1. Bileşen Bazında Durum Tablosu

| Bileşen | Veri Kaynağı | Mock Sorun | Notlar |
|---------|-------------|-----------|--------|
| DashboardView | Props (API tasks) | ❌ Yok | UI constants kullanıyor, sorun değil |
| **TableView** | tasks API ✓ | **✅ MOCK users import** | Satır 70-71: `users` mockData'dan |
| BoardView | tasks API ✓, users prop ✓ | ⚠️ initialColumns | Column renk/sıra mock (data değil) |
| CalendarView | tasks API ✓ | ❌ Yok | — |
| TimelineView | tasks API ✓ | ❌ Yok | createdAt→startDate, dueDate→endDate |
| PersonView | user+tasks+companies props ✓ | ⚠️ Online/lastSeen mock | seededRandom(userId) |
| PortfolioView | companies API ✓ | ❌ Yok | — |
| PortfolioDetailView | company+tasks props ✓ | ❌ Yok | — |
| AnalyticsView | tasks+companies props ✓ | ❌ Yok | DEFAULT_SERVICE_TYPES fallback |
| **TaskCommentsPanel** | activityLog ✓ | **✅ Sahte başlangıç yorumları** | buildInitialComments() fake |
| **Sidebar** | — | **✅ MOCK currentProject** | Satır 38: mockData import |
| **Header** | — | **✅ MOCK currentProject** | Proje adı/rengi mock |
| RecentlyDeletedPage | deletedTasks API ✓ | ❌ Yok | — |
| UsersManagementView | users API (context) ✓ | ❌ Yok | — |

---

## 2. Kritik Bulgular

### 2.1 TableView — Mock `users` Kullanımı
**Dosya:** `apps/ui/src/components/TableView.tsx` satır 70-71

```typescript
// ❌ YANLIŞ
import { initialColumns, priorityColors, priorityLabels, statusLabels, users } from '@/data/mockData';
```

`users` dizisi şu 9 noktada kullanılıyor:
- Satır 383, 508, 709, 1263, 1326, 1796, 1853, 1915, 1965

App.tsx zaten gerçek `users`'ı API'dan çekip state'e atıyor. Bu veri AppViewRouter üzerinden TableView'a prop olarak geçirilmeli, ardından mock import silinmeli.

### 2.2 Sidebar & Header — Mock `currentProject`
**Dosyalar:** `Sidebar.tsx:38`, `Header.tsx`

```typescript
// ❌ YANLIŞ
import { currentProject } from '@/data/mockData';
// currentProject.name = 'Geveze CRM'  ← hardcoded
```

Backend'de `settings` koleksiyonunda `companyName: "Geveze Ajans"` zaten var.  
Çözüm: Settings API'den `companyName` yükle, `currentProject.name` yerine kullan.

### 2.3 UI Constants — mockData'dan Import
```typescript
import { priorityColors, priorityLabels, statusLabels } from '@/data/mockData';
```
Bu 3 nesne dinamik veri DEĞİL, static sabitler. `lib/constants.ts`'e taşınmalı.  
16 farklı dosya bu sabitleri import ediyor.

### 2.4 TaskCommentsPanel — Sahte Yorum Üretimi
**Dosya:** `apps/ui/src/components/TaskCommentsPanel.tsx` satır 23-41

```typescript
const buildInitialComments = (task, userList) => {
  // task'ı atayan kişi + teammate sahte yorumlar üretiyor
  return [
    { id: `${task.id}-c1`, author: primary, text: 'Brief netleşti...' },
    { id: `${task.id}-c2`, author: teammate, text: 'Tamam, ...' },
  ];
};
```

Yorumlar local state'de tutuluyor, backend'e kaydetmiyor. Yorum sistemi henüz entegre değil.

### 2.5 PersonView — Online Status Mock
**Dosya:** `apps/ui/src/components/PersonView.tsx`

```typescript
const seededRandom = (seed: string) => { /* deterministic rng */ };
const rng = seededRandom(user.id);
const isOnline = rng() > 0.4;  // ❌ Her zaman aynı (user.id'ye göre)
const lastSeenMinutes = Math.floor(rng() * 120) + 5;  // ❌ Fake
const weeklyHours = Array.from({length: 7}, () => rng() * 6 + 4);  // ❌ Fake
```

Backend'de `User.lastActiveAt` alanı yok.

### 2.6 Settings — API Var Ama UI Bağlı Değil
Backend endpoint'leri tam:  
`GET /settings`, `PUT /settings/:key`, `PUT /settings`, `DELETE /settings/:key`

`apps/ui/src/lib/api.ts`'de sıfır settings fonksiyonu var.  
Seed'de `companyName: "Geveze Ajans"` var ama kullanılmıyor.

### 2.7 Portfolio Nested Updates
`PUT /portfolio/:id` tüm objeyi değiştiriyor.  
Ancak UI'da şirket içinde:
- Kişi ekle/düzenle/sil
- Sosyal medya hesabı yönetimi
- Aylık içerik takvimi
- Marka kimliği düzenleme
...gibi granüler operasyonlar yapılıyor fakat bunlar için ayrı endpoint yok.

---

## 3. Geçiş Öncesi Veri Akışı (Mevcut)

```
App.tsx useEffect
  ├── api.getUsers()          → users state ─────────────┐
  ├── api.getTasks()          → tasks state              │
  ├── api.getDeletedTasks()   → deletedTasks state        │ Çoğu bileşen
  ├── api.getPortfolio()      → portfolioCompanies state  │ props ile alıyor ✓
  ├── api.getTags()           → tagEntries state          │
  └── api.getServiceTypes()   → serviceTypeEntries state ─┘

ANCAK:
  TableView ────────────────────────────────────── mockData.users ❌
  Sidebar   ────────────────────────────────────── mockData.currentProject ❌
  Header    ────────────────────────────────────── mockData.currentProject ❌
  Settings  ─────── hiç yüklenmiyor ───────────── ❌
```

---

## 4. Backend'de Tamamen Eksik Özellikler

| Özellik | Etki | Çözüm |
|---------|------|-------|
| `/projects` veya `/settings/companyName` UI entegrasyonu | Sidebar/Header mock | API fn + App.tsx state |
| Yorum persistence | Yorumlar kaybolur | Task.comments[] veya activityLog yaklaşımı |
| User.lastActiveAt | PersonView fake | Schema field + middleware |
| Portfolio nested PATCH endpoint'leri | Granüler update yok | 4-5 yeni endpoint |
| Tags güncelleme endpoint'i | Tag rengi değiştirilemiyor | PATCH /tags/:id |
| Auth logout/refresh | Oturum kapanmıyor | POST /auth/logout |
| Task filtreleme (portfolioCompanyId, dateRange, tags) | BoardView/TableView filtresiz | Query param genişletme |
