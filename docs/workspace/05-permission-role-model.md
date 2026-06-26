# 05 — İzin ve Rol Modeli

## Mevcut Durum

### Global AppRole

```typescript
type AppRole = 'admin' | 'manager' | 'member';
```

Bu rol tek bir yerden (JWT token + MongoDB User.role) gelir.  
Tüm uygulama genelinde geçerlidir.

### Mevcut UserPermissions

```typescript
interface UserPermissions {
  canViewAnalytics: boolean;     // default: false (member)
  canViewArchive: boolean;       // default: true
  canViewTrash: boolean;         // default: true
  canManagePortfolio: boolean;   // default: false
  canCreateTasks: boolean;       // default: true
  canDeleteTasks: boolean;       // default: false
  canEditOthersTasks: boolean;   // default: false
}
```

### Mevcut Permission Türetme (App.tsx)

```typescript
// App.tsx
const isManager = appRole === 'admin' || appRole === 'manager';

const currentUserPerms = users.find(u => u.id === authUser?.id)?.permissions
  ?? DEFAULT_MEMBER_PERMISSIONS;

const effectivePerms = {
  canViewAnalytics:   isManager || currentUserPerms.canViewAnalytics,
  canViewArchive:     isManager || currentUserPerms.canViewArchive,
  canViewTrash:       isManager || currentUserPerms.canViewTrash,
  canManagePortfolio: isManager || currentUserPerms.canManagePortfolio,
  canCreateTasks:     isManager || currentUserPerms.canCreateTasks,
  canDeleteTasks:     isManager || currentUserPerms.canDeleteTasks,
  canEditOthersTasks: isManager || currentUserPerms.canEditOthersTasks,
};
```

### Mevcut Backend Guard'ları

```
JwtAuthGuard (global)   — tüm endpoint'ler için auth kontrolü
RolesGuard (global)     — @Roles() decorator ile endpoint bazlı kontrol
```

Örnek kullanım:
```typescript
@Roles('admin', 'manager')
@Post()
create(@Body() dto: CreateUserDto) { ... }
```

---

## Önerilen: Workspace-Level Role Modeli

### Yeni Rol Hiyerarşisi

```
AppRole (global, değişmez)     — platform düzeyinde (admin = platform sahibi)
WorkspaceRole (workspace bazında) — her workspace üyeliği için ayrı rol
```

### WorkspaceRole Tanımı

```typescript
type WorkspaceRole = 'workspace_admin' | 'workspace_manager' | 'workspace_member' | 'workspace_viewer';
```

| WorkspaceRole | Kısaltma | Açıklama |
|--------------|---------|----------|
| workspace_admin | W-Admin | Workspace'i yönetir, üye ekler/çıkarır, tüm CRUD |
| workspace_manager | W-Manager | Görev atama, portföy, raporlar, üye izinleri |
| workspace_member | W-Member | Kendi görevleri + izin verilen alanlar |
| workspace_viewer | W-Viewer | Salt okunur, hiçbir şey oluşturamaz |

### Global AppRole ile İlişki

```
global.admin     → tüm workspace'lerde workspace_admin yetkisi (superadmin)
global.manager   → ilgili workspace'te workspace_manager davranışı
global.member    → WorkspaceMember.role belirler gerçek yetkiyi
```

---

## İzin Matrisi

| Aksiyon | W-Admin | W-Manager | W-Member | W-Viewer |
|---------|---------|-----------|----------|----------|
| Workspace ayarlarını görmek | ✅ | ❌ | ❌ | ❌ |
| Workspace ayarlarını değiştirmek | ✅ | ❌ | ❌ | ❌ |
| Üye eklemek/çıkarmak | ✅ | ❌ | ❌ | ❌ |
| Üye rolünü değiştirmek | ✅ | ❌ | ❌ | ❌ |
| Member izinlerini düzenlemek | ✅ | ✅ | ❌ | ❌ |
| Görev oluşturmak | ✅ | ✅ | canCreateTasks | ❌ |
| Başkasının görevini düzenlemek | ✅ | ✅ | canEditOthersTasks | ❌ |
| Görev silmek | ✅ | ✅ | canDeleteTasks | ❌ |
| Arşivi görmek | ✅ | ✅ | canViewArchive | canViewArchive |
| Silinen görevleri görmek | ✅ | ✅ | canViewTrash | canViewTrash |
| Analitik görmek | ✅ | ✅ | canViewAnalytics | canViewAnalytics |
| Portföy yönetmek | ✅ | ✅ | canManagePortfolio | ❌ |
| Portföyü görmek | ✅ | ✅ | ✅ | ✅ |

---

## Önerilen Veri Modeli

```typescript
// packages/shared/src/index.ts eklentisi
type WorkspaceRole = 'workspace_admin' | 'workspace_manager' | 'workspace_member' | 'workspace_viewer';

interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  permissions: UserPermissions;   // mevcut granüler flagler korunur
  joinedAt: string;
  invitedBy?: string;
}
```

```typescript
// MongoDB WorkspaceMember koleksiyonu veya Workspace.members embed
{
  workspaceId: ObjectId,
  userId: ObjectId,
  role: 'workspace_member',
  permissions: {
    canViewAnalytics: false,
    canViewArchive: true,
    ...
  },
  joinedAt: Date,
  invitedBy: ObjectId
}
```

---

## Mevcut İzin Sistemiyle Geriye Uyumluluk

Mevcut `User.permissions` alanı korunur ama yorumu değişir:

**Eski:** `User.permissions` global, tüm uygulama için geçerli  
**Yeni:** `WorkspaceMember.permissions` workspace bazında geçerli  

Migration için:
1. Mevcut kullanıcılar "default workspace"e `workspace_member` rolüyle eklenir
2. `User.permissions` değerleri `WorkspaceMember.permissions`'a kopyalanır
3. `User.permissions` deprecated olarak kalır, ileride kaldırılır

---

## Backend Guard Güncellemesi

### Yeni Guard Katmanları

```
HTTP Request
  ↓
JwtAuthGuard          → userId doğrulama
  ↓
WorkspaceGuard        → request'teki workspaceId için userId üyelik kontrolü
  ↓
WorkspaceRolesGuard   → endpoint için gereken workspace rolü kontrolü
  ↓
Controller Method
```

### WorkspaceGuard Örneği

```typescript
// apps/api/src/modules/workspace/guards/workspace.guard.ts
@Injectable()
export class WorkspaceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.params.workspaceId ?? request.body.workspaceId;
    const userId = request.user.id;

    const member = await this.workspaceService.findMember(workspaceId, userId);
    if (!member) throw new ForbiddenException('Bu workspace üyesi değilsiniz');

    request.workspaceMember = member;
    return true;
  }
}
```

---

## Frontend Permission Hook Güncellemesi

```typescript
// Önerilen: useWorkspacePermissions()
const useWorkspacePermissions = () => {
  const { authUser } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const member = currentWorkspace?.members.find(m => m.userId === authUser?.id);
  const role = member?.role ?? 'workspace_viewer';
  const perms = member?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
  const isManager = role === 'workspace_admin' || role === 'workspace_manager';

  return {
    role,
    isManager,
    canViewAnalytics: isManager || perms.canViewAnalytics,
    canViewArchive: isManager || perms.canViewArchive,
    canViewTrash: isManager || perms.canViewTrash,
    canManagePortfolio: isManager || perms.canManagePortfolio,
    canCreateTasks: isManager || perms.canCreateTasks,
    canDeleteTasks: isManager || perms.canDeleteTasks,
    canEditOthersTasks: isManager || perms.canEditOthersTasks,
  };
};
```

Bu hook, `App.tsx`'in şu anki `effectivePerms` hesaplama bloğunun yerini alır.

---

## Aşamalı Geçiş Stratejisi

### Faz A — Mevcut sistemi koru (şu an)
- `AppRole` global rollerle çalışmaya devam et
- `UserPermissions` global izinler

### Faz B — Backend WorkspaceMember ekle
- `Workspace` koleksiyonu oluştur
- `WorkspaceMember` sub-document / koleksiyon ekle
- Mevcut kullanıcıları default workspace'e migrate et

### Faz C — Frontend WorkspaceContext
- `useWorkspacePermissions()` hook'u ekle
- App.tsx'deki `effectivePerms` hesaplamayı hook'a taşı

### Faz D — Guard'ları workspace-aware yap
- `WorkspaceGuard` ekle
- Tüm resource endpoint'leri workspaceId ile filtrele

---

## Açık Sorular

- Global `admin` kullanıcının workspace'lere otomatik `workspace_admin` mi olması gerekir?
- `workspace_viewer` rolü ilk versiyonda gerekli mi?
- `WorkspaceMember.permissions` yoksa `WorkspaceRole` izinleri yeterli mi olur?

→ Bkz. `11-open-questions.md`
