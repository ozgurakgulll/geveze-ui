# Geveze UI — Backend Entegrasyon Fazları

> Güncelleme: 2026-06-26  
> Hedef: Tüm mock verilerden temizlenerek 100% gerçek API'a geçmek

---

## Faz Özeti

| Faz | Başlık | Süre | Öncelik |
|-----|--------|------|---------|
| [Faz 1](#faz-1) | UI Sabitleri & Settings | ~2 saat | 🔴 Kritik |
| [Faz 2](#faz-2) | TableView & Sidebar/Header Mock Fix | ~3 saat | 🔴 Kritik |
| [Faz 3](#faz-3) | Yorum Sistemi Persistence | ~4 saat | 🟠 Önemli |
| [Faz 4](#faz-4) | Portfolio Nested Updates | ~5 saat | 🟠 Önemli |
| [Faz 5](#faz-5) | Task Filtreleme Genişletme | ~3 saat | 🟡 Orta |
| [Faz 6](#faz-6) | Auth Logout + Token Refresh | ~2 saat | 🟡 Orta |
| [Faz 7](#faz-7) | PersonView Gerçek Aktivite | ~6 saat | 🟢 İsteğe bağlı |
| [Faz 8](#faz-8) | Tags & ServiceTypes Güncelleme | ~2 saat | 🟢 İsteğe bağlı |

---

## Faz 1 — UI Sabitleri & Settings Entegrasyonu

**Hedef:** `priorityColors/Labels`, `statusLabels` sabitlerini mockData'dan ayır. Settings API'yi UI'a bağla.

### 1A — UI Constants Dosyası Oluştur

**Yeni dosya:** `apps/ui/src/lib/constants.ts`

```typescript
export const PRIORITY_COLORS = {
  low: '#10B981', medium: '#F59E0B', high: '#EF4444', urgent: '#DC2626',
};

export const PRIORITY_LABELS = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', urgent: 'Acil',
};

export const STATUS_LABELS = {
  brief: 'Planlandı', 'in-progress': 'Çalışılıyor',
  review: 'İncelemede', revision: 'Revizyonda', done: 'Tamamlandı',
};

export const STATUS_COLORS = {
  brief: '#64748B', 'in-progress': '#F59E0B',
  review: '#6366F1', revision: '#EF4444', done: '#10B981',
};
```

**Etkilenen dosyalar (import path güncelle):**
- `App.tsx` — `priorityLabels, statusLabels`
- `Header.tsx` — `statusLabels`
- `Sidebar.tsx` — (yok ama mockData import var)
- `BoardView.tsx`
- `TaskCard.tsx` — `priorityColors, priorityLabels, statusLabels, initialColumns`
- `TaskDetailDialog.tsx` — `priorityColors, priorityLabels, statusLabels`
- `AddTaskDialog.tsx` — `priorityColors, priorityLabels`
- `CalendarView.tsx` — `priorityColors`
- `TimelineView.tsx` — `statusLabels`
- `DashboardView.tsx` — `priorityColors, priorityLabels`
- `PersonView.tsx` — `priorityColors, statusLabels`
- `AnalyticsView.tsx` — `priorityColors, priorityLabels, statusLabels`
- `CompanyAnalyticsView.tsx` — `statusLabels, priorityLabels, priorityColors`
- `RecentlyDeletedPage.tsx` — `priorityColors, priorityLabels`
- `archive/ArchiveTaskItem.tsx`
- `TableView.tsx` — `priorityColors, priorityLabels, statusLabels`

### 1B — Settings API Fonksiyonları

**`apps/ui/src/lib/api.ts`'e ekle:**

```typescript
// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = (): Promise<Record<string, unknown>> =>
  request<Record<string, unknown>>('/settings');

export const updateSetting = (key: string, value: unknown): Promise<void> =>
  request<void>(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });

export const updateSettings = (settings: Record<string, unknown>): Promise<void> =>
  request<void>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
```

### 1C — App.tsx'e Settings Yükleme

**`apps/ui/src/App.tsx`** — Başlangıç fetch'e ekle:

```typescript
const [appSettings, setAppSettings] = useState<Record<string, unknown>>({});

// useEffect içinde:
Promise.all([
  api.getUsers(),
  api.getTasks(fetchedUsers),
  api.getPortfolio(),
  api.getTags(),
  api.getServiceTypes(),
  api.getSettings(),  // ← YENİ
]).then(([users, tasks, companies, tags, serviceTypes, settings]) => {
  setAppSettings(settings);
  // ...
});
```

### 1D — Sidebar & Header'da companyName Kullan

**`apps/ui/src/components/Sidebar.tsx`:**
```typescript
// ❌ Kaldır:
import { currentProject } from '@/data/mockData';

// ✓ Props veya context'ten al:
interface SidebarProps {
  companyName?: string;
  // ...
}
```

**`apps/ui/src/components/Header.tsx`:**
```typescript
// ❌ Kaldır:
import { currentProject } from '@/data/mockData';

// ✓ Props'tan al:
interface HeaderProps {
  companyName?: string;
  // ...
}
// Görüntülemede: companyName ?? 'Geveze'
```

**`apps/ui/src/App.tsx`:**
```typescript
const companyName = String(appSettings['companyName'] ?? 'Geveze');
// Header ve Sidebar'a prop olarak geç
<Header companyName={companyName} ... />
<Sidebar companyName={companyName} ... />
```

---

## Faz 2 — TableView & BoardView Mock Fix

**Hedef:** `TableView.tsx`'deki mock `users` import'unu gerçek API state'iyle değiştir.

### 2A — TableView'a `users` Prop Ekle

**`apps/ui/src/components/TableView.tsx`:**
```typescript
// ❌ Kaldır:
import { ..., users } from '@/data/mockData';

// ✓ Props interface'e ekle:
interface TableViewProps {
  tasks: Task[];
  users: User[];  // ← YENİ
  companies: PortfolioCompany[];
  // ...
}
```

### 2B — AppViewRouter'dan TableView'a users Geç

**`apps/ui/src/components/app/AppViewRouter.tsx`:**
```typescript
// Prop ekle ve TableView'a geç:
<TableView users={users} tasks={tasks} companies={companies} ... />
```

### 2C — BoardView initialColumns Refactor

**`apps/ui/src/components/BoardView.tsx`:**
```typescript
// ❌ Kaldır:
import { initialColumns } from '@/data/mockData';

// ✓ COLUMN_DEFINITIONS olarak tanımla (tasks olmadan):
const COLUMN_DEFINITIONS = [
  { id: 'brief' as TaskStatus,      title: 'Planlandı',   color: '#64748B' },
  { id: 'in-progress' as TaskStatus, title: 'Çalışılıyor', color: '#F59E0B' },
  { id: 'review' as TaskStatus,     title: 'İncelemede',  color: '#6366F1' },
  { id: 'revision' as TaskStatus,   title: 'Revizyonda',  color: '#EF4444' },
  { id: 'done' as TaskStatus,       title: 'Tamamlandı',  color: '#10B981' },
];
// Runtime'da tasks bu sütunlara dağıtılır
```

### 2D — mockData.ts Temizliği

Faz 1 ve 2 tamamlandıktan sonra, `mockData.ts`'den kalan her şey kaldırılabilir:
- `users` — API'dan geliyor
- `baseTasks`, `testTasks`, `initialTasks` — API'dan geliyor
- `initialColumns` — COLUMN_DEFINITIONS'a taşındı
- `currentProject` — Settings API'den geliyor
- `timelineItems` — computed, task'lardan üretildi
- `priorityColors`, `priorityLabels`, `statusLabels` — `lib/constants.ts`'e taşındı

---

## Faz 3 — Yorum Sistemi Persistence

**Hedef:** `TaskCommentsPanel`'deki sahte yorumları kaldır, yorumları backend'e kaydet.

### 3A — Task Schema'ya Comments Ekle

**`apps/api/src/modules/tasks/schemas/task.schema.ts`:**
```typescript
// Yeni yapı:
export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string; // ISO
  attachments?: TaskAttachment[];
}

// Schema'ya ekle:
@Prop({
  type: [{
    id: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String },
    text: { type: String, required: true },
    createdAt: { type: String, required: true },
  }],
  default: [],
})
comments: TaskComment[];
```

### 3B — Comments Endpoint'leri

**`apps/api/src/modules/tasks/tasks.controller.ts`'e ekle:**
```typescript
@Post(':id/comments')
addComment(
  @Param('id') taskId: string,
  @Body() dto: { text: string },
  @Request() req: { user: { id: string; name: string } },
): Promise<Task> {
  return this.tasksService.addComment(taskId, req.user.id, req.user.name, dto.text);
}

@Delete(':id/comments/:commentId')
@HttpCode(HttpStatus.NO_CONTENT)
removeComment(
  @Param('id') taskId: string,
  @Param('commentId') commentId: string,
): Promise<void> {
  return this.tasksService.removeComment(taskId, commentId);
}
```

### 3C — Shared Types Güncelleme

**`packages/shared/src/index.ts`'e ekle:**
```typescript
export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  attachments?: TaskAttachment[];
}
```

**`Task` interface'e ekle:**
```typescript
comments?: TaskComment[];
```

### 3D — api.ts Fonksiyonları

```typescript
export async function addTaskComment(
  taskId: string,
  text: string,
  userList: User[],
): Promise<Task> {
  const raw = await request<Record<string, unknown>>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return parseApiTask(raw, userList);
}

export const deleteTaskComment = (taskId: string, commentId: string): Promise<void> =>
  request<void>(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
```

### 3E — TaskCommentsPanel Refactor

```typescript
// ❌ Kaldır:
const buildInitialComments = (task, userList) => { ... };
const [comments, setComments] = useState(buildInitialComments(task, userList));

// ✓ Yerine:
const comments = task.comments ?? [];
const handleSend = async () => {
  const updated = await api.addTaskComment(task.id, text, users);
  onTaskUpdate(updated); // App.tsx'deki handler
};
```

---

## Faz 4 — Portfolio Nested Updates

**Hedef:** Portföy içinde kişi, sosyal medya, takvim, marka yönetimini backend'e bağla.

### 4A — Backend PATCH Endpoint'leri

**`apps/api/src/modules/portfolio/portfolio.controller.ts`'e ekle:**

```typescript
// Kişi Yönetimi
@Patch(':id/contacts')
updateContacts(@Param('id') id: string, @Body() body: { contacts: CompanyContact[] }) {
  return this.portfolioService.updateField(id, 'contacts', body.contacts);
}

// Sosyal Medya
@Patch(':id/social-media')
updateSocialMedia(@Param('id') id: string, @Body() body: { accounts: SocialMediaAccount[] }) {
  return this.portfolioService.updateField(id, 'socialMediaAccounts', body.accounts);
}

// Marka Kimliği
@Patch(':id/brand')
updateBrand(@Param('id') id: string, @Body() body: { brandIdentity: BrandIdentity }) {
  return this.portfolioService.updateField(id, 'brandIdentity', body.brandIdentity);
}

// İçerik Takvimi
@Patch(':id/calendar')
updateCalendar(@Param('id') id: string, @Body() body: { calendar: ContentCalendarItem[] }) {
  return this.portfolioService.updateField(id, 'monthlyContentCalendar', body.calendar);
}

// Notlar
@Patch(':id/notes')
updateNotes(@Param('id') id: string, @Body() body: { notes: string[] }) {
  return this.portfolioService.updateField(id, 'notes', body.notes);
}
```

### 4B — PortfolioService Yardımcı Metot

```typescript
async updateField(id: string, field: string, value: unknown): Promise<PortfolioCompany> {
  const doc = await this.companyModel.findByIdAndUpdate(
    id,
    { [field]: value },
    { new: true }
  ).lean();
  if (!doc) throw new NotFoundException();
  return this.toDto(doc);
}
```

### 4C — api.ts Fonksiyonları

```typescript
export const updatePortfolioContacts = (id: string, contacts: CompanyContact[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/contacts`, {
    method: 'PATCH', body: JSON.stringify({ contacts }),
  });

export const updatePortfolioSocialMedia = (id: string, accounts: SocialMediaAccount[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/social-media`, {
    method: 'PATCH', body: JSON.stringify({ accounts }),
  });

export const updatePortfolioBrand = (id: string, brandIdentity: BrandIdentity): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/brand`, {
    method: 'PATCH', body: JSON.stringify({ brandIdentity }),
  });

export const updatePortfolioCalendar = (id: string, calendar: ContentCalendarItem[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/calendar`, {
    method: 'PATCH', body: JSON.stringify({ calendar }),
  });

export const updatePortfolioNotes = (id: string, notes: string[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/notes`, {
    method: 'PATCH', body: JSON.stringify({ notes }),
  });
```

---

## Faz 5 — Task Filtreleme Genişletme

**Hedef:** Şirkete, tarihe, etikete ve önceliğe göre görev filtreleme.

### 5A — Backend Query Params Genişlet

**`apps/api/src/modules/tasks/tasks.controller.ts`:**
```typescript
@Get()
findAll(
  @Query('archived') archived?: string,
  @Query('assigneeId') assigneeId?: string,
  @Query('status') status?: string,
  @Query('portfolioCompanyId') portfolioCompanyId?: string,  // YENİ
  @Query('priority') priority?: string,                       // YENİ
  @Query('tags') tags?: string,                               // YENİ (CSV)
  @Query('dueDateFrom') dueDateFrom?: string,                 // YENİ
  @Query('dueDateTo') dueDateTo?: string,                     // YENİ
  @Query('search') search?: string,                           // YENİ
)
```

**`apps/api/src/modules/tasks/tasks.service.ts`:**
```typescript
// findAll() filter'a ekle:
if (filters.portfolioCompanyId) query['portfolioCompanyId'] = filters.portfolioCompanyId;
if (filters.priority) query['priority'] = filters.priority;
if (filters.tags?.length) query['tags'] = { $all: filters.tags };
if (filters.dueDateFrom || filters.dueDateTo) {
  query['dueDate'] = {};
  if (filters.dueDateFrom) query['dueDate']['$gte'] = new Date(filters.dueDateFrom);
  if (filters.dueDateTo) query['dueDate']['$lte'] = new Date(filters.dueDateTo);
}
if (filters.search) query['title'] = { $regex: filters.search, $options: 'i' };
```

### 5B — api.ts Güncelleme

```typescript
export async function getTasks(
  userList: User[],
  params?: {
    archived?: boolean;
    assigneeId?: string;
    status?: string;
    portfolioCompanyId?: string;  // YENİ
    priority?: string;             // YENİ
    tags?: string[];               // YENİ
    dueDateFrom?: string;          // YENİ
    dueDateTo?: string;            // YENİ
    search?: string;               // YENİ
  },
): Promise<Task[]> {
  const q = new URLSearchParams();
  // ... mevcut params ...
  if (params?.portfolioCompanyId) q.set('portfolioCompanyId', params.portfolioCompanyId);
  if (params?.priority) q.set('priority', params.priority);
  if (params?.tags?.length) q.set('tags', params.tags.join(','));
  if (params?.dueDateFrom) q.set('dueDateFrom', params.dueDateFrom);
  if (params?.dueDateTo) q.set('dueDateTo', params.dueDateTo);
  if (params?.search) q.set('search', params.search);
  // ...
}
```

---

## Faz 6 — Auth Logout & Token Refresh

**Hedef:** Oturum kapatma + 401 hatalarında otomatik çıkış.

### 6A — Backend Logout

**`apps/api/src/modules/auth/auth.controller.ts`'e ekle:**
```typescript
@Post('logout')
@HttpCode(HttpStatus.NO_CONTENT)
logout(): void {
  // Stateless JWT: client-side token silme yeterli
  // Opsiyonel: token blacklist Redis'e yazılabilir
}
```

### 6B — API Client 401 Handler

**`apps/ui/src/lib/api.ts`:**
```typescript
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // ...
  if (res.status === 401) {
    // AuthContext logout tetikle
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Oturum süresi doldu');
  }
  // ...
}
```

**`apps/ui/src/contexts/AuthContext.tsx`:**
```typescript
useEffect(() => {
  const handler = () => logout();
  window.addEventListener('auth:unauthorized', handler);
  return () => window.removeEventListener('auth:unauthorized', handler);
}, []);
```

### 6C — api.ts Logout Fonksiyonu

```typescript
export const logout = (): Promise<void> =>
  request<void>('/auth/logout', { method: 'POST' });
```

---

## Faz 7 — PersonView Gerçek Aktivite Verisi

**Hedef:** Fake online/lastSeen/weeklyHours verilerini kaldır veya gerçek veri ile değiştir.

### 7A — User Schema'ya lastActiveAt Ekle

**`apps/api/src/modules/users/schemas/user.schema.ts`:**
```typescript
@Prop({ type: Date })
lastActiveAt?: Date;
```

### 7B — Auth Middleware ile Güncelleme

**`apps/api/src/modules/auth/auth.middleware.ts`** (yeni dosya):
```typescript
@Injectable()
export class UpdateLastActiveMiddleware implements NestMiddleware {
  constructor(@InjectModel(UserModel.name) private userModel: Model<UserDocument>) {}
  
  async use(req: Request, res: Response, next: NextFunction) {
    if (req.user?.id) {
      // Throttle: son 5 dakikadan fazla ise güncelle
      await this.userModel.findByIdAndUpdate(req.user.id, {
        lastActiveAt: new Date()
      });
    }
    next();
  }
}
```

### 7C — PersonView Refactor

```typescript
// ❌ Kaldır:
const isOnline = seededRandom(user.id)() > 0.4;
const lastSeenMinutes = Math.floor(seededRandom(user.id)() * 120) + 5;

// ✓ Gerçek veri:
const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
const minutesAgo = lastActive
  ? Math.floor((Date.now() - lastActive.getTime()) / 60000)
  : null;
const isOnline = minutesAgo !== null && minutesAgo < 5;
const lastSeenText = minutesAgo !== null
  ? minutesAgo < 1 ? 'Az önce' : `${minutesAgo} dk önce`
  : 'Bilinmiyor';
```

---

## Faz 8 — Tags & ServiceTypes Güncelleme Endpoint'leri

**Hedef:** Tag ve hizmet tipi adı/rengi değiştirilebilir hale getir.

### 8A — Tags PATCH Endpoint'i

**`apps/api/src/modules/tags/tags.controller.ts`'e ekle:**
```typescript
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() body: { name?: string; color?: string },
): Promise<{ id: string; name: string; color: string }> {
  return this.tagsService.update(id, body);
}
```

### 8B — ServiceTypes PATCH Endpoint'i

```typescript
@Patch(':id')
update(@Param('id') id: string, @Body() body: { name: string }) {
  return this.serviceTypesService.update(id, body.name);
}
```

### 8C — api.ts Fonksiyonları

```typescript
export const updateTag = (id: string, data: { name?: string; color?: string }) =>
  request<{ id: string; name: string; color: string }>(`/tags/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  });

export const updateServiceType = (id: string, name: string) =>
  request<{ id: string; name: string }>(`/service-types/${id}`, {
    method: 'PATCH', body: JSON.stringify({ name }),
  });
```

---

## Test Kontrol Listesi

Her faz sonrası:

- [ ] `npm run build -w apps/ui` → sıfır TS hatası
- [ ] `npx nest build` (api/) → sıfır hata
- [ ] Admin ile giriş → tüm viewlar açılıyor
- [ ] Görev oluştur, güncelle, sil → gerçek DB'ye yazıyor
- [ ] Tarayıcı yenile → veri kaybolmuyor (localStorage DEĞİL DB'den geliyor)
- [ ] mockData.ts import'ları sıfır (Faz 2 sonrası)

---

## Sonraki Adım

**Faz 1'e başlamak için:**
1. `apps/ui/src/lib/constants.ts` dosyasını oluştur
2. `apps/ui/src/lib/api.ts`'e settings fonksiyonlarını ekle
3. `apps/ui/src/App.tsx`'e `api.getSettings()` ekle
4. Header ve Sidebar'dan `currentProject` import'unu kaldır, `companyName` prop al
5. 16 dosyada import path'lerini `@/data/mockData` → `@/lib/constants` yap
