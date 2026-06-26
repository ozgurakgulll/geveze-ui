# 01 — Mevcut Proje Yapısı

## Genel Bakış

Geveze CRM, **Turborepo** tabanlı bir monorepo içinde geliştirilmektedir.

```
geveze-ui/
├── apps/
│   ├── ui/          — React 18 + Vite + TypeScript (SPA)
│   └── api/         — NestJS + MongoDB + Mongoose (REST API)
├── packages/
│   └── shared/      — Ortak TypeScript tip tanımları
├── docs/            — Proje dokümantasyonu
├── turbo.json
└── package.json
```

---

## apps/ui — Frontend

### Teknoloji Yığını

| Araç | Versiyon | Amaç |
|------|----------|-------|
| React | 18 | UI kütüphanesi |
| Vite | 5 | Build tool |
| TypeScript | 5 | Tip güvenliği |
| TailwindCSS | 3 | Stil |
| shadcn/ui | — | UI component kütüphanesi (Radix tabanlı) |
| date-fns | — | Tarih işlemleri |
| dnd-kit | — | Drag & drop (BoardView) |
| sonner | — | Toast bildirimleri |
| recharts | — | Grafik/analytics |
| lucide-react | — | İkon kütüphanesi |

### Klasör Yapısı

```
apps/ui/src/
├── main.tsx                  ← Entry point
├── App.tsx                   ← Root component (1407 satır, monolitik)
├── index.css
├── assets/
│   └── geveze-logo.png
├── components/
│   ├── app/
│   │   └── AppViewRouter.tsx ← View switch router
│   ├── archive/
│   │   └── ArchivePage.tsx
│   ├── users/
│   │   ├── UsersManagementView.tsx
│   │   ├── AddUserDialog.tsx
│   │   ├── EditUserDialog.tsx
│   │   ├── PermissionsSheet.tsx
│   │   └── ResetPasswordDialog.tsx
│   ├── ui/                   ← shadcn/ui bileşenleri
│   ├── Sidebar.tsx           ← Ana navigasyon
│   ├── Header.tsx            ← Üst bar + filtreler
│   ├── DashboardView.tsx
│   ├── TableView.tsx         ← Ana Tablo (en büyük dosya ~2000 satır)
│   ├── BoardView.tsx         ← Kanban
│   ├── TimelineView.tsx
│   ├── CalendarView.tsx
│   ├── AnalyticsView.tsx
│   ├── PersonView.tsx
│   ├── PortfolioView.tsx
│   ├── PortfolioDetailView.tsx
│   ├── TaskDetailDialog.tsx
│   ├── TaskCommentsPanel.tsx
│   ├── TaskCard.tsx
│   └── ...
├── contexts/
│   ├── AuthContext.tsx       ← JWT token + user bilgisi
│   └── UsersContext.tsx      ← Kullanıcı listesi (read-only)
├── data/
│   └── mockData.ts           ← Eski mock veri (hâlâ mevcut, import edilmiyor)
├── lib/
│   ├── api.ts                ← Tüm API çağrıları (tek dosya)
│   ├── constants.ts          ← UI sabitleri (renkler, etiketler, sütunlar)
│   ├── taskProgress.ts
│   └── utils.ts
└── types.ts                  ← @geveze/shared re-export
```

### Router Yapısı

**Önemli:** Uygulama herhangi bir client-side router kütüphanesi kullanmıyor.  
(`react-router-dom`, `wouter`, `@tanstack/router` yok.)

Navigasyon tamamen **React state** tabanlı:

```typescript
// App.tsx
type ViewType = 'table' | 'portfolio' | 'board' | 'timeline' |
                'dashboard' | 'calendar' | 'person' | 'analytics' |
                'archive' | 'trash' | 'users';

const [currentView, setCurrentView] = useState<ViewType>(loadInitialView);
```

`loadInitialView()` sadece `localStorage` okur:
```typescript
const loadInitialView = (): ViewType => {
  const saved = localStorage.getItem('geveze.crm.currentView');
  return isViewType(saved) ? saved : 'dashboard';
};
```

**Sonuç:** URL hiçbir zaman değişmez. Tarayıcı geri/ileri butonu çalışmaz. Deep link mevcut değil.

---

## apps/api — Backend

### Teknoloji Yığını

| Araç | Versiyon | Amaç |
|------|----------|-------|
| NestJS | 10 | Framework |
| MongoDB | 7 | Veritabanı |
| Mongoose | 8 | ODM |
| Fastify | — | HTTP adapter |
| JWT | — | Authentication |
| Passport | — | Auth middleware |
| bcrypt | — | Şifre hashleme |
| class-validator | — | DTO doğrulama |

### Modül Yapısı

```
apps/api/src/
├── main.ts                ← Bootstrap (port 3001)
├── app.module.ts          ← Global guards (JwtAuthGuard, RolesGuard)
└── modules/
    ├── auth/              ← JWT login, guards, decorators
    ├── tasks/             ← Task CRUD, archive, bulk ops, comments, attachments
    ├── users/             ← User CRUD, permissions, password, role
    ├── portfolio/         ← Portfolio company CRUD + nested PATCH
    ├── tags/              ← Tag CRUD + PATCH
    ├── service-types/     ← ServiceType CRUD + PATCH
    └── settings/          ← Key-value store (companyName vb.)
```

### Mevcut Endpoint'ler (Özet)

| Module | Endpoint'ler |
|--------|-------------|
| auth | POST /api/auth/login |
| tasks | GET/POST/PUT/DELETE /api/tasks + bulk + archive + comments + attachments |
| users | GET/POST/PATCH/DELETE /api/users + permissions + password + role |
| portfolio | GET/POST/PUT/DELETE /api/portfolio + /contacts /social-media /brand /calendar /notes |
| tags | GET/POST/PATCH/DELETE /api/tags |
| service-types | GET/POST/PATCH/DELETE /api/service-types |
| settings | GET/PUT/DELETE /api/settings |

**Eksik:** Workspace, Organization, WorkspaceMember, Board, BoardView modülleri yok.

---

## packages/shared — Ortak Tipler

```typescript
// Temel tipler
type TaskStatus = 'brief' | 'in-progress' | 'review' | 'revision' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type AppRole = 'admin' | 'manager' | 'member'
type ViewType = 'table' | 'portfolio' | 'board' | 'timeline' | 'dashboard'
               | 'calendar' | 'person' | 'analytics' | 'archive' | 'trash' | 'users'

// Ana modeller
interface User { id, name, email, initials, color, title?, role, permissions?, lastActiveAt? }
interface Task { id, title, status, priority, assignee?, tags, progress, comments?, attachments?, ... }
interface PortfolioCompany { id, name, contacts[], socialMediaAccounts[], brandIdentity, ... }
interface TaskComment { id, authorId, authorName, text, createdAt }

// Eksik modeller
// ❌ Workspace / Organization yok
// ❌ WorkspaceMember yok
// ❌ Board / BoardView yok
```

---

## Mevcut Veri Akışı

```
MongoDB
  ↓
NestJS API (port 3001)
  ↓ HTTP/REST
apps/ui/src/lib/api.ts (tek dosya, ~380 satır)
  ↓ Promise.all (startup)
App.tsx state (useState hooks)
  ↓ props drilling
Sidebar → Header → AppViewRouter → [DashboardView | TableView | BoardView | ...]
```

**Sorun:** Tüm veri tek bir `App.tsx` içinde yönetiliyor. 1407 satır, 77 adet hook.

---

## Mevcut Auth Akışı

```
LoginPage → POST /api/auth/login
  ↓
{ token, user: { id, name, email, color, initials, role } }
  ↓
localStorage (geveze.auth.token + geveze.auth.user)
  ↓
AuthContext → useAuth() hook
  ↓
App.tsx → authUser, appRole → effectivePerms
```

---

## Öncelik

| Durum | Değerlendirme |
|-------|--------------|
| Backend modülleri | Sağlam, genişletilebilir |
| Auth | Çalışıyor, JWT-based |
| Veri akışı | Çalışıyor ama ölçeklenemiyor |
| Router | Yok — kritik eksik |
| Workspace konsepti | Hiç yok |
| URL-based navigation | Yok |
| Multi-tenant/workspace | Yok |
