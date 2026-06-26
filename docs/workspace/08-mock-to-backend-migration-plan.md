# 08 — Mock'tan Backend'e Geçiş Planı

## Mevcut Durum Özeti

### Tamamlanmış Geçişler

| Veri | Mock → Backend | Durum |
|------|---------------|-------|
| Kullanıcı listesi | `mockData.users[]` → `GET /api/users` | ✅ Tamamlandı |
| Task listesi | mock task'lar → `GET /api/tasks` | ✅ Tamamlandı |
| Tag listesi | hardcoded → `GET /api/tags` | ✅ Tamamlandı |
| Servis türleri | hardcoded → `GET /api/service-types` | ✅ Tamamlandı |
| Portfolio şirketleri | mock → `GET /api/portfolio` | ✅ Tamamlandı |
| Şirket adı (companyName) | `mockData.currentProject.name` → `GET /api/settings` | ✅ Tamamlandı |
| Task yorumları | `buildInitialComments()` mock → MongoDB tasks.comments | ✅ Tamamlandı |
| Kullanıcı son aktiflik | `seededRandom()` mock → `User.lastActiveAt` | ✅ Tamamlandı (hybrid) |
| Priority / status renkleri | `mockData.priorityColors` → `constants.ts` | ✅ Tamamlandı |

### Hâlâ Mock / Hardcoded Kalan Durumlar

| Veri | Mevcut Mock | Durum |
|------|-------------|-------|
| Workspace kartı alt başlığı | `"Ajans iş takibi"` hardcoded | ⚠️ Workspace planında |
| Workspace rengi | `#6161FF` hardcoded | ⚠️ Workspace planında |
| Timeline items | `mockData.timelineItems` | ⚠️ Workspace planı sonrası |
| PersonView online status | hybrid (lastActiveAt varsa gerçek, yoksa random) | ⚠️ Migration tamamlanmadı |
| `mockData.ts` dosyası | Dosya mevcut, import edilmiyor | ℹ️ Temizlenebilir |

---

## Devam Eden Geçiş Görevleri

### 1. PersonView Online Status (Hybrid → Tam Gerçek)

**Sorun:** `PersonView.tsx` ~satır 219-236'da:
```typescript
// Gerçek lastActiveAt varsa kullan; yoksa mock
if (user.lastActiveAt) {
  // gerçek hesaplama
} else {
  const mockOnline = rng() > 0.4;  // ← mock fallback hâlâ aktif
  const mockMin = Math.floor(rng() * 120) + 5;
  return { isOnline: mockOnline, lastSeenLabel: `${mockMin} dk önce görüldü` };
}
```

**Çözüm:** `lastActiveAt` tüm kullanıcılar için set edilince fallback kaldırılabilir.  
Trigger: Auth login sırasında `users.service.updateLastActive(id)` çağrısı zaten yapılıyor.  
Yeni kullanıcılar ilk login sonrasında gerçek veri alacak.

**Aksiyon:** Eski kullanıcıların `lastActiveAt` null ise "Çevrimiçi değil" göster.  
Mock random data üretmeyi bırak.

### 2. Workspace Sidebar Hardcoded Değerleri

**Sorun:** `Sidebar.tsx` ~satır 264-278:
```tsx
<div className="... bg-[#6161FF]">    {/* hardcoded renk */}
  <Star className="h-5 w-5" />        {/* hardcoded ikon */}
</div>
<h3>{companyName}</h3>                {/* Settings API'dan ✅ */}
<p>Ajans iş takibi</p>               {/* hardcoded açıklama */}
```

**Çözüm:** Workspace modeli oluşturulduktan sonra:
- `color` → `workspace.color`
- `icon` → `workspace.icon`
- Alt başlık → `workspace.description`

### 3. Timeline Items

**Sorun:** `TimelineView.tsx` hâlâ `mockData.timelineItems` import ediyor mu?

**Kontrol gerekiyor.** Eğer ediyor ise backend'de Timeline items için endpoint gerekir  
ya da Task'ların `startDate` + `dueDate` alanları kullanılır (tercih edilen).

---

## mockData.ts Durumu

**Dosya:** `apps/ui/src/data/mockData.ts`

**Mevcut içerik:**
```typescript
export const users: User[] = [...];      // ← artık kullanılmıyor
export const currentProject = {...};     // ← artık kullanılmıyor
export const timelineItems = [...];     // ← kullanımı belirsiz
export const priorityColors = {...};    // ← constants.ts'e taşındı
export const priorityLabels = {...};    // ← constants.ts'e taşındı
export const statusLabels = {...};      // ← constants.ts'e taşındı
export const baseTasks: Task[] = [...]; // ← artık kullanılmıyor
```

**Aksiyon:** `timelineItems` import durumu doğrulandıktan sonra dosya kaldırılabilir.  
Bu dosyayı silmek güvenlidir çünkü hiçbir component import etmiyor (agent doğruladı).

---

## Backend'e Geçiş Yapılmamış Potansiyel Alanlar (Workspace Sonrası)

### Workspace Metadata

| Bilgi | Şu an | Hedef |
|-------|-------|-------|
| Workspace adı | `settings.companyName` | `workspace.name` |
| Workspace rengi | `#6161FF` hardcoded | `workspace.color` |
| Workspace açıklaması | `"Ajans iş takibi"` hardcoded | `workspace.description` |
| Workspace ikonu | `<Star />` hardcoded | `workspace.icon` |

### Task İstatistikleri

`DashboardView.tsx` task'ları client-side filtreyerek istatistik hesaplıyor.  
Backend aggregation ile `GET /api/workspaces/:id/stats` endpoint'i daha performanslı olur.

---

## Geçiş Öncelik Sırası

```
P0 (blocker) — Workspace veri modeli oluşturulana kadar bekle:
  - Sidebar hardcoded değerleri

P1 (bağımsız, yapılabilir):
  - PersonView mock fallback kaldırma
  - mockData.ts temizleme (timelineItems kontrolü sonrası)

P2 (workspace sonrası):
  - Dashboard server-side stats
  - Timeline backend endpoint
```

---

## Frontend API Değişiklik Listesi (Workspace Geçişi İçin)

Workspace geçişinde `apps/ui/src/lib/api.ts` dosyasına eklenecek fonksiyonlar:

```typescript
// Workspace CRUD
getWorkspaces(): Promise<Workspace[]>
createWorkspace(dto: CreateWorkspaceDto): Promise<Workspace>
getWorkspace(id: string): Promise<Workspace>
updateWorkspace(id: string, dto: UpdateWorkspaceDto): Promise<Workspace>
deleteWorkspace(id: string): Promise<void>

// Üye yönetimi
addWorkspaceMember(workspaceId: string, dto: InviteMemberDto): Promise<WorkspaceMember>
updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember>
updateWorkspaceMemberPermissions(workspaceId: string, userId: string, perms: UserPermissions): Promise<WorkspaceMember>
removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>
```

Mevcut `getTasks()`, `getPortfolio()` vb. fonksiyonlar `workspaceId` parametresi alacak şekilde güncellenir.

---

## Regresyon Riski

| Değişiklik | Risk | Önlem |
|-----------|------|-------|
| `getTasks()` URL değişimi | Orta | Feature flag veya kademeli rollout |
| `User.permissions` deprecated | Düşük | WorkspaceMember.permissions önce eklenir |
| mockData.ts silme | Çok Düşük | Import yok, güvenli |
| `currentProject` kaldırma | Yok | Zaten kullanılmıyor |
