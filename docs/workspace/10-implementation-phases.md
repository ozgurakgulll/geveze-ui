# 10 — Uygulama Fazları

## Genel Strateji

- Her faz bağımsız olarak tamamlanabilir ve test edilebilir
- Faz tamamlandığında mevcut özellikler çalışmaya devam eder (regresyon yok)
- Backend fazları frontend fazlarından önce tamamlanır
- Her faz sonunda build + commit

---

## Faz 0 — Mevcut Borç Temizleme (Pre-workspace)

**Süre:** ~1-2 saat  
**Bağımlılık:** Yok

### Görevler

- [ ] `apps/ui/src/data/mockData.ts` silinebilir mi kontrol et (timelineItems import var mı?)
- [ ] `PersonView.tsx` mock fallback'i kaldır — `lastActiveAt` null ise "Bilgi yok" göster
- [ ] Sidebar'daki "Ajans iş takibi" hardcoded alt başlığı `appSettings['workspaceDescription']` yap
- [ ] `mockData.ts` dosyasını sil (import yoksa)
- [ ] Stale todo listesini temizle

### Kabul Kriterleri

```
- npm run build (apps/ui) → sıfır TS hatası
- PersonView'da lastActiveAt null kullanıcılar için "Son aktiflik bilinmiyor" görünür
- mockData.ts dosyası silinmişse uygulama hâlâ çalışır
```

---

## Faz 1 — Backend: Workspace Modülü

**Süre:** ~3-4 saat  
**Bağımlılık:** Faz 0

### 1A — Shared Types

```typescript
// packages/shared/src/index.ts eklemeleri
type WorkspaceRole = 'workspace_admin' | 'workspace_manager' | 'workspace_member' | 'workspace_viewer';
interface WorkspaceMember { userId, role, permissions, joinedAt, invitedBy? }
interface Workspace { id, name, slug, description?, color, icon?, createdAt, updatedAt, createdBy, members }
interface CreateWorkspaceDto { name, description?, color?, icon? }
interface UpdateWorkspaceDto { name?, description?, color?, icon? }
interface InviteMemberDto { userId, role? }
```

### 1B — WorkspaceSchema (MongoDB)

```
apps/api/src/modules/workspace/schemas/workspace.schema.ts
```

WorkspaceModel + WorkspaceMemberSchema (embed)  
İndeksler: `slug unique`, `members.userId`

### 1C — WorkspaceService

```
apps/api/src/modules/workspace/workspace.service.ts
```

Metodlar:
- `create(dto, createdBy)` → slug üretir, ilk üye olarak oluşturucu eklenir
- `findByUser(userId)` → kullanıcının üye olduğu workspace'ler
- `findById(id)` → tek workspace
- `update(id, dto)` → name/description/color/icon
- `remove(id)` → cascade: tasks/portfolio/tags/servicetypes sil veya workspace'i deaktif et
- `addMember(workspaceId, dto)` → $push members
- `updateMemberRole(workspaceId, userId, role)` → $set members.$.role
- `updateMemberPermissions(workspaceId, userId, perms)` → $set members.$.permissions
- `removeMember(workspaceId, userId)` → $pull members

### 1D — WorkspaceController + Guard

```
apps/api/src/modules/workspace/workspace.controller.ts
apps/api/src/modules/workspace/guards/workspace.guard.ts
```

Endpoint'ler: bkz. `07-workspace-api-plan.md`

### 1E — WorkspaceModule + AppModule Kaydı

```typescript
// app.module.ts imports listesine WorkspaceModule ekle
```

### Kabul Kriterleri

```
POST /api/workspaces → 201 Created
GET /api/workspaces → [workspace]
GET /api/workspaces/:id → workspace detail
PATCH /api/workspaces/:id → update
POST /api/workspaces/:id/members → member eklendi
DELETE /api/workspaces/:id/members/:userId → üye çıkarıldı
```

---

## Faz 2 — Backend: Kaynak İzolasyonu

**Süre:** ~2-3 saat  
**Bağımlılık:** Faz 1

### 2A — Schema Güncellemeleri (workspaceId alanı ekleme)

```typescript
// tasks, portfolio, tags, servicetypes, settings schema'larına:
@Prop({ type: String, required: true, index: true })
workspaceId: string;
```

### 2B — Migration Script

```javascript
// apps/api/scripts/migrate-workspace.js
// Tüm mevcut kaynaklara default workspaceId ekle
```

### 2C — Service Güncellemeleri (workspaceId filtresi)

```typescript
// tasks.service.ts findAll():
query.workspaceId = workspaceId;  // ← eklenir

// portfolio.service.ts findAll():
return this.model.find({ workspaceId }).lean().exec();
```

### 2D — Controller Güncellemeleri

Mevcut endpoint'ler `workspaceId` query param veya header kabul eder.  
Uzun vadede prefix geçişi: `/api/workspaces/:id/tasks`

### Kabul Kriterleri

```
GET /api/tasks?workspaceId=ws_abc → sadece o workspace'in task'ları
GET /api/portfolio?workspaceId=ws_abc → sadece o workspace'in şirketleri
workspaceId olmayan eski request'ler backward compat için "default" workspace'e map edilir
```

---

## Faz 3 — Frontend: WorkspaceContext + Router

**Süre:** ~4-6 saat  
**Bağımlılık:** Faz 1

### 3A — react-router-dom Kurulumu

```bash
npm install react-router-dom -w apps/ui
```

### 3B — WorkspaceContext Oluşturma

```
apps/ui/src/contexts/WorkspaceContext.tsx
```

Bkz. `09-frontend-integration-plan.md` — WorkspaceContextValue

### 3C — api.ts Workspace Fonksiyonları

```typescript
getWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace,
addWorkspaceMember, updateWorkspaceMemberRole, updateWorkspaceMemberPermissions, removeWorkspaceMember
```

### 3D — main.tsx BrowserRouter

```tsx
<BrowserRouter>
  <AuthProvider>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </AuthProvider>
</BrowserRouter>
```

### 3E — App.tsx Route Yapısı

- `<Routes>` ve `<Route>` ile view routing
- `AppViewRouter.tsx` kaldırılır (veya deprecated olarak tutulur)
- localStorage `currentView` yerine URL path

### 3F — WorkspaceListPage

```
apps/ui/src/pages/WorkspaceListPage.tsx
```

Workspace listesi + "Yeni Workspace" CTA

### Kabul Kriterleri

```
/ → /workspaces yönlendirir
/workspaces → workspace listesi görünür
/workspaces/:id/table → table view açılır, URL değişir
/workspaces/:id/board → board view açılır
Tarayıcı geri butonu çalışır
Sayfa yenilendiğinde aynı view açılır
```

---

## Faz 4 — Frontend: Sidebar Workspace Switcher

**Süre:** ~2-3 saat  
**Bağımlılık:** Faz 3

### 4A — Sidebar'a Workspace Switcher Eklenmesi

- `useWorkspace()` ile workspace listesi
- `DropdownMenu` ile workspace seçimi
- Renk, ikon, üye sayısı gösterimi
- "Yeni Workspace" linki

### 4B — NavLink Dönüşümü

```tsx
// button onClick → NavLink
<NavLink to={`/workspaces/${workspaceId}/table`}>Ana Tablo</NavLink>
```

### 4C — Header Breadcrumb

```tsx
// Header'da aktif view adı route'dan gelir
const { pathname } = useLocation();
const viewName = getViewName(pathname);  // 'table' → 'Ana Tablo'
```

### Kabul Kriterleri

```
Sidebar'da aktif workspace adı ve rengi görünür
Workspace değiştiğinde tüm view'lar o workspace'in verilerini gösterir
Aktif nav item vurgulu
```

---

## Faz 5 — Frontend: Workspace Ayarları ve Üye Yönetimi

**Süre:** ~3-4 saat  
**Bağımlılık:** Faz 3, Faz 4

### 5A — WorkspaceSettingsPage

```
apps/ui/src/pages/WorkspaceSettingsPage.tsx
```

- Genel bilgiler formu (name, description, color, icon)
- Üye listesi + rol değiştirme
- Üye ekleme (mevcut kullanıcılardan seçme)
- Üye çıkarma

### 5B — useWorkspacePermissions Hook

```
apps/ui/src/hooks/useWorkspacePermissions.ts
```

App.tsx'deki `effectivePerms` hesaplama buraya taşınır.

### 5C — Mevcut UsersManagementView Entegrasyonu

`UsersManagementView.tsx` workspace member'larla çalışacak şekilde güncellenir.  
Global user CRUD, workspace member CRUD ile tamamlanır.

### Kabul Kriterleri

```
/workspaces/:id/settings → ayarlar sayfası
Workspace adı değiştirilebilir
Renk değiştirilebilir
Üye eklenebilir/çıkarılabilir
Üye izinleri güncellenebilir
workspace_admin olmayan kullanıcılar için form disabled
```

---

## Faz 6 — Workspace Oluşturma Akışı

**Süre:** ~2 saat  
**Bağımlılık:** Faz 3

### 6A — CreateWorkspacePage / Dialog

```
apps/ui/src/pages/CreateWorkspacePage.tsx
```

Adımlar:
1. Workspace adı
2. Renk ve ikon seçimi
3. İlk üyeleri davet (opsiyonel)
4. Tamamlandı

### 6B — Default Workspace Redirect

Yeni kullanıcı girişi → workspace yok → create workspace CTA

---

## Faz 7 — Migration ve Temizlik

**Süre:** ~2 saat  
**Bağımlılık:** Faz 1-6 tamamlandı

### 7A — Eski Endpoint'lerin Kaldırılması

`/api/tasks` (workspace-prefix olmayan) deprecated edilir ve sonra kaldırılır.

### 7B — mockData.ts Silme (eğer Faz 0'da yapılmadıysa)

### 7C — localStorage Temizleme

`geveze.crm.currentView` key'i artık kullanılmaz.

### 7D — E2E Test

Tüm view'lar, tüm roller için temel akışlar test edilir.

---

## Faz Özeti

| Faz | Kapsam | Süre | Bağımlılık |
|-----|--------|------|------------|
| Faz 0 | Borç temizleme | 1-2h | — |
| Faz 1 | Backend workspace modülü | 3-4h | Faz 0 |
| Faz 2 | Backend kaynak izolasyonu | 2-3h | Faz 1 |
| Faz 3 | Frontend context + router | 4-6h | Faz 1 |
| Faz 4 | Sidebar workspace switcher | 2-3h | Faz 3 |
| Faz 5 | Ayarlar ve üye yönetimi | 3-4h | Faz 3, 4 |
| Faz 6 | Workspace oluşturma akışı | 2h | Faz 3 |
| Faz 7 | Migration ve temizlik | 2h | Faz 1-6 |
| **TOPLAM** | | **~19-26h** | |

---

## Risk Değerlendirmesi

| Risk | Olasılık | Etki | Önlem |
|------|---------|------|-------|
| App.tsx refactor sırasında regression | Yüksek | Yüksek | Her faz sonrası build test |
| workspaceId migration hataları | Orta | Yüksek | Script test env'de önce çalıştırılır |
| react-router-dom uyumsuzluk | Düşük | Orta | Küçük bir test branch'inde önce dene |
| Guard hataları (workspace izolasyonu) | Orta | Orta | Her endpoint postman ile test |
| Performans (workspace list query) | Düşük | Düşük | `members.userId` index hazır |
