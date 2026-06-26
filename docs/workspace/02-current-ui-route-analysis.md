# 02 — Mevcut UI Route Analizi

## Özet

Uygulama herhangi bir client-side router kütüphanesi **kullanmıyor**.  
(`react-router-dom`, `wouter`, `@tanstack/router` — hiçbiri mevcut değil.)

Navigasyon tamamen **React state** tabanlıdır. URL hiçbir zaman değişmez.

---

## Mevcut "Router" Mekanizması

### 1. ViewType Enum

```typescript
// packages/shared/src/index.ts
type ViewType =
  | 'table'       // Ana Tablo
  | 'portfolio'   // Portföy
  | 'board'       // Tahta (Kanban)
  | 'timeline'    // Zaman Çizelgesi
  | 'dashboard'   // Gösterge Paneli
  | 'calendar'    // Takvim
  | 'person'      // Kişi Profili
  | 'analytics'   // Analitik
  | 'archive'     // Arşiv
  | 'trash'       // Son Silinenler
  | 'users';      // Kullanıcı Yönetimi
```

### 2. State Yönetimi (App.tsx)

```typescript
// Başlangıç değeri localStorage'dan yüklenir
const loadInitialView = (): ViewType => {
  const saved = localStorage.getItem('geveze.crm.currentView');
  return isViewType(saved) ? saved : 'dashboard';
};

const [currentView, setCurrentView] = useState<ViewType>(loadInitialView);
```

### 3. View Değiştirme

```typescript
// Sidebar button click
const handleViewChange = (view: ViewType) => {
  setCurrentView(view);
  localStorage.setItem('geveze.crm.currentView', view);
};
```

### 4. Render Dallanması

```
App.tsx render()
├── isLoading → <LoadingScreen />
├── !token → <LoginPage />
└── token ✓ →
    ├── currentView === 'trash' → <RecentlyDeletedPage />
    ├── currentView === 'users' → <UsersManagementView />
    └── else → <AppViewRouter currentView={currentView} />
                 switch(currentView)
                 ├── 'dashboard'  → <DashboardView />
                 ├── 'table'      → <TableView />
                 ├── 'portfolio'  → <PortfolioView />
                 ├── 'board'      → <BoardView />
                 ├── 'timeline'   → <TimelineView />
                 ├── 'calendar'   → <CalendarView />
                 ├── 'person'     → <PersonView />
                 ├── 'analytics'  → <AnalyticsView />
                 ├── 'archive'    → <ArchivePage />
                 └── default      → <BoardView />
```

---

## Mevcut URL Durumu

| Senaryo | URL |
|---------|-----|
| Dashboard | `http://localhost:5173/` |
| Table | `http://localhost:5173/` ← aynı |
| Board | `http://localhost:5173/` ← aynı |
| Başka kullanıcıya gönder | Çalışmaz |
| Tarayıcı geri | Çalışmaz |
| Sayfa yenile | Çalışır (localStorage'dan) |
| Başka sekme | Dashboard'dan başlar |

---

## Sorunlar

### 1. Deep Link Yok
Bir görevi, bir tahtayı veya belirli bir view'ı paylaşmak mümkün değil.  
`/workspaces/abc123/board` gibi bir URL share edilemiyor.

### 2. Tarayıcı Navigasyonu Çalışmıyor
Back/Forward düğmeleri view geçmişini takip etmiyor.  
Browser history API entegre edilmemiş.

### 3. Workspace İzolasyonu Yok
URL'de `workspaceId` parametresi olmadığı için hangi workspace'in verilerinin  
gösterildiği belirsiz. Birden fazla workspace geldiğinde bu kritik bir sorun olacak.

### 4. Auth Guard Yok (Route Seviyesinde)
Auth kontrolü App.tsx'in render dalında `!token` şartına indirgenmiş.  
Route bazlı permission kontrolü yok.

### 5. Lazy Loading Eksik Kalıntılar
AppViewRouter `Suspense` + `lazy()` kullanıyor ama bazı child  
component'ler hâlâ synchronous import yapıyor.

---

## Önerilen URL Yapısı (Workspace Dönüşümü İçin)

```
/                                   → Workspace listesi (veya son workspace'e redirect)
/login                              → Login sayfası
/workspaces                         → Tüm workspace'leri listele
/workspaces/new                     → Yeni workspace oluştur
/workspaces/:workspaceId            → Workspace default view (dashboard)
/workspaces/:workspaceId/dashboard  → Gösterge Paneli
/workspaces/:workspaceId/table      → Ana Tablo
/workspaces/:workspaceId/board      → Tahta
/workspaces/:workspaceId/timeline   → Zaman Çizelgesi
/workspaces/:workspaceId/calendar   → Takvim
/workspaces/:workspaceId/portfolio  → Portföy
/workspaces/:workspaceId/analytics  → Analitik
/workspaces/:workspaceId/archive    → Arşiv
/workspaces/:workspaceId/deleted    → Son Silinenler
/workspaces/:workspaceId/members    → Üye Yönetimi
/workspaces/:workspaceId/settings   → Ayarlar
```

---

## Kritik Karar: Router Kütüphanesi

Workspace dönüşümü için bir router kütüphanesi **zorunludur**.

### Seçenekler

| Kütüphane | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **react-router-dom v6** | Olgun, geniş ekosistem | Boilerplate fazla |
| **@tanstack/router** | Tip güvenli, modern | Nispeten yeni |
| **wouter** | Minimal, küçük | Özellik sınırlı |

**Öneri:** `react-router-dom v6` — mevcut `useCallback` handler yapısıyla uyumlu,  
`<Outlet>` ile nested layout desteği mevcut, community büyük.

---

## Geçiş Riski

| Risk | Seviye | Açıklama |
|------|--------|----------|
| URL yapısı değişir | Yüksek | Tüm Sidebar nav link'leri yeniden yazılır |
| App.tsx refactor | Yüksek | 1407 satır, state management parçalanır |
| Deep link çalışmaya başlar | Düşük risk | Pozitif değişim |
| localStorage dependency | Orta | `currentView` artık URL'den okunur |

---

## Etkilenen Dosyalar (Sadece Analiz)

```
apps/ui/src/
├── main.tsx                    ← BrowserRouter wrapper
├── App.tsx                     ← Route tanımları + layout
├── components/Sidebar.tsx      ← Link → NavLink dönüşümü
├── components/Header.tsx       ← Breadcrumb / aktif view
└── components/app/AppViewRouter.tsx ← Outlet yapısına geçiş
```

---

## Öncelik: YÜKSEK

Router entegrasyonu, workspace dönüşümünün **temel altyapısıdır**.  
Bu adım atılmadan workspace URL izolasyonu mümkün değil.
