# 09 — Frontend Entegrasyon Planı

## Genel Strateji

Mevcut `App.tsx` monoliti bozmadan workspace desteği eklemek için iki yaklaşım:

**A) Kademeli genişletme** (önerilen): Mevcut state yönetimi korunur, üstüne  
`WorkspaceContext` eklenir. `App.tsx` küçültülmez, sadece yeni state eklenir.

**B) Büyük refactor**: App.tsx parçalanır, her view kendi state'ini yönetir.  
Riskli, uzun süre. Workspace dönüşümü ile birlikte yapılmaz.

---

## Yeni Context: WorkspaceContext

```typescript
// apps/ui/src/contexts/WorkspaceContext.tsx

interface WorkspaceContextValue {
  workspaces: Workspace[];           // kullanıcının tüm workspace'leri
  currentWorkspace: Workspace | null; // aktif workspace
  isLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (dto: CreateWorkspaceDto) => Promise<Workspace>;
  updateWorkspace: (id: string, dto: UpdateWorkspaceDto) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  // Üye yönetimi
  addMember: (userId: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  updateMemberPermissions: (userId: string, perms: UserPermissions) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
};
```

---

## Provider Hiyerarşisi (Sonrası)

```tsx
// main.tsx (sonraki durum)
<AuthProvider>
  <WorkspaceProvider>      {/* ← yeni */}
    <UsersProvider>
      <App />
    </UsersProvider>
  </WorkspaceProvider>
</AuthProvider>
```

---

## Yeni Hook: useWorkspacePermissions

```typescript
// apps/ui/src/hooks/useWorkspacePermissions.ts

export const useWorkspacePermissions = () => {
  const { authUser } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const member = currentWorkspace?.members.find(m => m.userId === authUser?.id);
  const role = member?.role ?? 'workspace_viewer';
  const perms = member?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
  const isAdmin = role === 'workspace_admin';
  const isManager = isAdmin || role === 'workspace_manager';

  return {
    role,
    isAdmin,
    isManager,
    canViewAnalytics:   isManager || perms.canViewAnalytics,
    canViewArchive:     isManager || perms.canViewArchive,
    canViewTrash:       isManager || perms.canViewTrash,
    canManagePortfolio: isManager || perms.canManagePortfolio,
    canCreateTasks:     isManager || perms.canCreateTasks,
    canDeleteTasks:     isManager || perms.canDeleteTasks,
    canEditOthersTasks: isManager || perms.canEditOthersTasks,
  };
};
```

Bu hook, `App.tsx`'deki `effectivePerms` hesaplama bloğunun yerini alacak.

---

## Router Entegrasyonu

### Paket Kurulumu

```bash
npm install react-router-dom -w apps/ui
```

### Temel Route Yapısı

```tsx
// apps/ui/src/main.tsx
import { BrowserRouter } from 'react-router-dom';

root.render(
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <UsersProvider>
          <App />
        </UsersProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);
```

```tsx
// apps/ui/src/App.tsx (kısaltılmış)
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const { token } = useAuth();
  if (!token) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="/workspaces" element={<WorkspaceListPage />} />
      <Route path="/workspaces/:workspaceId/*" element={<WorkspaceLayout />} />
    </Routes>
  );
}

function WorkspaceLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardView />} />
            <Route path="table"      element={<TableView />} />
            <Route path="board"      element={<BoardView />} />
            <Route path="timeline"   element={<TimelineView />} />
            <Route path="calendar"   element={<CalendarView />} />
            <Route path="portfolio"  element={<PortfolioView />} />
            <Route path="analytics"  element={<AnalyticsView />} />
            <Route path="archive"    element={<ArchivePage />} />
            <Route path="deleted"    element={<RecentlyDeletedPage />} />
            <Route path="members"    element={<UsersManagementView />} />
            <Route path="settings"   element={<WorkspaceSettingsPage />} />
            <Route path="person/:userId" element={<PersonView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
```

---

## Sidebar Güncellemesi

```tsx
// components/Sidebar.tsx değişiklikler

// Mevcut:
<button onClick={() => onViewChange('table')}>Ana Tablo</button>

// Sonraki:
import { NavLink } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const { workspaceId } = useParams();

<NavLink
  to={`/workspaces/${workspaceId}/table`}
  className={({ isActive }) => isActive ? 'bg-indigo-50 text-indigo-700' : ''}
>
  Ana Tablo
</NavLink>
```

### Workspace Switcher (Yeni Bölüm)

```tsx
// Sidebar.tsx — workspace switcher bölümü
const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();

<div className="px-3 mb-4">
  <DropdownMenu>
    <DropdownMenuTrigger>
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: currentWorkspace?.color ?? '#6161FF' }}
        >
          {currentWorkspace?.name?.charAt(0) ?? 'G'}
        </div>
        <div>
          <p className="font-medium text-sm">{currentWorkspace?.name}</p>
          <p className="text-xs text-gray-500">{currentWorkspace?.members.length} üye</p>
        </div>
        <ChevronDown className="h-4 w-4 ml-auto" />
      </div>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {workspaces.map(ws => (
        <DropdownMenuItem
          key={ws.id}
          onClick={() => navigate(`/workspaces/${ws.id}/dashboard`)}
        >
          <div
            className="w-4 h-4 rounded mr-2"
            style={{ backgroundColor: ws.color }}
          />
          {ws.name}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate('/workspaces/new')}>
        <Plus className="h-4 w-4 mr-2" />
        Yeni Workspace
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

---

## API Çağrılarında workspaceId

Mevcut API fonksiyonlarının imzaları güncellenir:

```typescript
// Önce:
export const getTasks = (userList: User[], params?: {...}): Promise<Task[]>

// Sonra:
export const getTasks = (
  workspaceId: string,
  userList: User[],
  params?: {...}
): Promise<Task[]>

// Önce:
export const getPortfolio = (): Promise<PortfolioCompany[]>

// Sonra:
export const getPortfolio = (workspaceId: string): Promise<PortfolioCompany[]>
```

---

## WorkspaceListPage (Yeni Sayfa)

```tsx
// apps/ui/src/pages/WorkspaceListPage.tsx

export const WorkspaceListPage = () => {
  const { workspaces, isLoading } = useWorkspace();
  const navigate = useNavigate();

  if (isLoading) return <LoadingScreen />;

  if (workspaces.length === 0) {
    return <CreateFirstWorkspacePrompt />;
  }

  // Tek workspace varsa doğrudan yönlendir
  if (workspaces.length === 1) {
    return <Navigate to={`/workspaces/${workspaces[0].id}/dashboard`} replace />;
  }

  return (
    <div className="p-8">
      <h1>Workspace'leriniz</h1>
      <div className="grid grid-cols-3 gap-4">
        {workspaces.map(ws => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            onClick={() => navigate(`/workspaces/${ws.id}/dashboard`)}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## WorkspaceSettingsPage (Yeni Sayfa)

```tsx
// apps/ui/src/pages/WorkspaceSettingsPage.tsx

export const WorkspaceSettingsPage = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const { isAdmin } = useWorkspacePermissions();

  return (
    <div>
      {/* Genel Bilgiler */}
      <WorkspaceGeneralSettings
        workspace={currentWorkspace}
        onSave={updateWorkspace}
        disabled={!isAdmin}
      />
      {/* Üye Yönetimi */}
      <WorkspaceMembersSection />
    </div>
  );
};
```

---

## Etkilenen Component'ler Listesi

| Component | Değişiklik |
|-----------|-----------|
| `main.tsx` | BrowserRouter wrapper |
| `App.tsx` | Routes yapısı, WorkspaceContext integration |
| `Sidebar.tsx` | NavLink, workspace switcher bölümü |
| `Header.tsx` | Breadcrumb (aktif route'dan), view label |
| `AppViewRouter.tsx` | Kaldırılır, Routes ile değiştirilir |
| `api.ts` | workspaceId parametresi eklenmesi |

### Değiştirilmeyecekler (View component'leri)

`DashboardView`, `TableView`, `BoardView`, `TimelineView`, `CalendarView`,  
`PortfolioView`, `AnalyticsView`, `PersonView`, `ArchivePage`,  
`RecentlyDeletedPage`, `UsersManagementView` — bu component'ler kendi içlerinde  
değişmez; sadece props'ları `useWorkspace()` / `useWorkspacePermissions()` ile  
sağlanmaya başlar.

---

## localStorage Geçişi

```typescript
// Önce (App.tsx):
localStorage.getItem('geveze.crm.currentView')

// Sonra (URL artık view'ı tutar, localStorage gerekmez):
// URL: /workspaces/ws_abc/table → aktif view = 'table'

// Workspace tercihini localStorage'da tut:
localStorage.setItem('geveze.lastWorkspaceId', workspaceId);
```

---

## Tahmini Etki Tablosu

| Kategori | Dosya Sayısı | Efor |
|----------|-------------|------|
| Yeni dosyalar | ~8 (context, pages, hooks) | Orta |
| Güncellenen dosyalar | ~5 (App, Sidebar, Header, api.ts, main.tsx) | Yüksek |
| Değişmeyen dosyalar | ~20 (tüm view component'ler) | Sıfır |
| Silinen dosyalar | AppViewRouter.tsx | Düşük |
