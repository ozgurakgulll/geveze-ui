# Faz 3 — Frontend: API Entegrasyonu

## Hedef

`apps/ui` içindeki tüm localStorage operasyonlarını REST API çağrılarıyla
değiştir. **Tasarım ve bileşenler değişmeyecek.** Tüm API istemci kodu
`@geveze/shared` tiplerini kullanarak tam TypeScript güvencesi sağlar.

---

## Yeni Dosyalar

```
apps/ui/src/
├── api/
│   ├── client.ts             ← temel fetch wrapper (typed)
│   ├── tasks.api.ts          ← görev endpoint'leri
│   ├── users.api.ts          ← kullanıcı endpoint'leri
│   ├── portfolio.api.ts      ← portföy endpoint'leri
│   ├── tags.api.ts           ← etiket endpoint'leri
│   ├── service-types.api.ts  ← hizmet tipi endpoint'leri
│   └── settings.api.ts       ← ayarlar endpoint'leri
└── contexts/
    └── AuthContext.tsx        ← Faz 4'te doldurulacak stub
```

---

## api/client.ts

```typescript
import type { ApiError } from '@geveze/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('geveze_token')
      : null;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const err: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      error: response.statusText,
      message: response.statusText,
    }));

    if (response.status === 401) {
      window.localStorage.removeItem('geveze_token');
      window.location.href = '/';
    }

    throw new ApiClientError(err.message, err.statusCode);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get:    <T>(path: string)                     => request<T>(path),
  post:   <T>(path: string, body: unknown)      => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)      => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)     => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string)                        => request<void>(path, { method: 'DELETE' }),
};
```

---

## api/tasks.api.ts

```typescript
import { apiClient } from './client';
import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskAttachment,
} from '@geveze/shared';

export interface TaskFilters {
  archived?: boolean;
  assigneeId?: string;
  status?: string;
}

function buildQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.archived !== undefined) params.set('archived', String(filters.archived));
  if (filters.assigneeId)            params.set('assigneeId', filters.assigneeId);
  if (filters.status)                params.set('status', filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const tasksApi = {
  getAll:   (filters: TaskFilters = {}) =>
    apiClient.get<Task[]>(`/api/tasks${buildQuery(filters)}`),

  getOne:   (id: string) =>
    apiClient.get<Task>(`/api/tasks/${id}`),

  create:   (dto: CreateTaskDto) =>
    apiClient.post<Task>('/api/tasks', dto),

  update:   (id: string, dto: UpdateTaskDto) =>
    apiClient.put<Task>(`/api/tasks/${id}`, dto),

  remove:   (id: string) =>
    apiClient.delete(`/api/tasks/${id}`),

  archive:  (id: string, archived: boolean) =>
    apiClient.patch<Task>(`/api/tasks/${id}/archive`, { archived }),

  bulkDelete:   (ids: string[]) =>
    apiClient.patch<void>('/api/tasks/bulk/delete', { ids }),

  bulkReassign: (ids: string[], assigneeId: string, assigneeName?: string) =>
    apiClient.patch<void>('/api/tasks/bulk/reassign', { ids, assigneeId, assigneeName }),

  bulkArchive:  (ids: string[]) =>
    apiClient.patch<void>('/api/tasks/bulk/archive', { ids }),

  addAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'uploadedAt'>) =>
    apiClient.patch<Task>(`/api/tasks/${taskId}/attachments`, attachment),

  removeAttachment: (taskId: string, attachmentId: string) =>
    apiClient.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`),
};
```

---

## api/users.api.ts

```typescript
import { apiClient } from './client';
import type { User } from '@geveze/shared';

export const usersApi = {
  getAll: () => apiClient.get<User[]>('/api/users'),
  getOne: (id: string) => apiClient.get<User>(`/api/users/${id}`),
};
```

---

## api/portfolio.api.ts

```typescript
import { apiClient } from './client';
import type {
  PortfolioCompany,
  CreatePortfolioCompanyDto,
  UpdatePortfolioCompanyDto,
} from '@geveze/shared';

export const portfolioApi = {
  getAll:  () =>
    apiClient.get<PortfolioCompany[]>('/api/portfolio-companies'),

  getOne:  (id: string) =>
    apiClient.get<PortfolioCompany>(`/api/portfolio-companies/${id}`),

  create:  (dto: CreatePortfolioCompanyDto) =>
    apiClient.post<PortfolioCompany>('/api/portfolio-companies', dto),

  update:  (id: string, dto: UpdatePortfolioCompanyDto) =>
    apiClient.put<PortfolioCompany>(`/api/portfolio-companies/${id}`, dto),

  remove:  (id: string) =>
    apiClient.delete(`/api/portfolio-companies/${id}`),
};
```

---

## api/tags.api.ts

```typescript
import { apiClient } from './client';

interface TagItem { id: string; name: string }

export const tagsApi = {
  getAll: () => apiClient.get<TagItem[]>('/api/tags'),
  add:    (name: string) => apiClient.post<TagItem>('/api/tags', { name }),
  remove: (name: string) => apiClient.delete(`/api/tags/${encodeURIComponent(name)}`),
};
```

---

## api/settings.api.ts

```typescript
import { apiClient } from './client';
import type { TableColumnSchemaItem } from '@geveze/shared';

export const settingsApi = {
  getTableSchema: () =>
    apiClient.get<{ value: TableColumnSchemaItem[] }>('/api/settings/tableColumnSchema'),

  updateTableSchema: (schema: TableColumnSchemaItem[]) =>
    apiClient.put<void>('/api/settings/tableColumnSchema', { value: schema }),

  getTagServiceMap: () =>
    apiClient.get<{ value: Record<string, string> }>('/api/settings/tagServiceMap'),

  updateTagServiceMap: (map: Record<string, string>) =>
    apiClient.put<void>('/api/settings/tagServiceMap', { value: map }),
};
```

---

## App.tsx Değişiklikleri

### Başlangıç State Yüklemesi

**Önce (localStorage):**
```typescript
const [tasks, setTasks] = useState<Task[]>(loadInitialTasks);
const [users, setUsers] = useState<User[]>(mockUsers);
const [portfolioCompaniesState, setPortfolioCompaniesState] =
  useState<PortfolioCompany[]>(loadInitialPortfolioCompanies);
```

**Sonra (API):**
```typescript
const [tasks, setTasks] = useState<Task[]>([]);
const [users, setUsers] = useState<User[]>([]);
const [portfolioCompaniesState, setPortfolioCompaniesState] = useState<PortfolioCompany[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  Promise.all([
    tasksApi.getAll({ archived: false }),
    usersApi.getAll(),
    portfolioApi.getAll(),
    tagsApi.getAll(),
    settingsApi.getTableSchema(),
    settingsApi.getTagServiceMap(),
  ])
    .then(([taskList, userList, portfolioList, tagList, tableSchema, tagServiceMap]) => {
      setTasks(taskList);
      setUsers(userList);
      setPortfolioCompaniesState(portfolioList);
      setTagList(tagList.map(t => t.name));
      if (tableSchema.value?.length) setTableColumnSchema(tableSchema.value);
      if (tagServiceMap.value)      setTagServiceMap(tagServiceMap.value);
    })
    .catch(err => toast.error(`Veri yüklenemedi: ${err.message}`))
    .finally(() => setIsLoading(false));
}, []);
```

### useEffect Kaydetmelerini Kaldır

Şu anda localStorage'a yazan tüm `useEffect`'ler **kaldırılır**. Yerine
API çağrıları callback'lerin içine yerleştirilir.

### Callback Dönüşümü (Optimistik Güncelleme Paterni)

```typescript
const handleCreateTask = useCallback(
  async (taskData: CreateTaskDto) => {
    try {
      const newTask = await tasksApi.create(taskData);
      setTasks(prev => [...prev, newTask]);
      toast.success('Görev oluşturuldu!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Görev oluşturulamadı');
    }
  },
  [],
);

const handleUpdateTask = useCallback(
  async (taskId: string, payload: UpdateTaskDto) => {
    // Optimistik güncelleme
    const original = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...payload } : t)));
    try {
      const updated = await tasksApi.update(taskId, payload);
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      toast.success('Görev güncellendi');
      setSelectedTaskId(null);
    } catch (err) {
      // Geri al
      if (original) setTasks(prev => prev.map(t => (t.id === taskId ? original : t)));
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız');
    }
  },
  [tasks],
);
```

### Güncellenecek Tüm Callback'ler

| Callback | API çağrısı |
|----------|-------------|
| `handleCreateTask` | `tasksApi.create()` |
| `handleUpdateTask` | `tasksApi.update()` |
| `handleDeleteTask` | `tasksApi.remove()` |
| `handleBulkDeleteTasks` | `tasksApi.bulkDelete()` |
| `handleBulkReassignTasks` | `tasksApi.bulkReassign()` |
| `handleBulkArchiveTasks` | `tasksApi.bulkArchive()` |
| `handleRestoreFromArchive` | `tasksApi.archive(id, false)` |
| `handleAddAttachment` | `tasksApi.addAttachment()` |
| `handleRemoveAttachment` | `tasksApi.removeAttachment()` |
| `handleCreatePortfolioCompany` | `portfolioApi.create()` |
| `handleUpdatePortfolioCompany` | `portfolioApi.update()` |
| `handleDeletePortfolioCompany` | `portfolioApi.remove()` |
| `handleAddServiceType` | `serviceTypesApi.add()` |
| `handleRemoveServiceType` | `serviceTypesApi.remove()` |
| `handleAddTag` | `tagsApi.add()` |
| `setTableColumnSchema` (side effect) | `settingsApi.updateTableSchema()` |
| `setTagServiceMap` (side effect) | `settingsApi.updateTagServiceMap()` |

---

## Yükleme Ekranı

```tsx
// App.tsx içine ekle
if (isLoading) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <img src="/geveze-logo.png" alt="Geveze" className="h-10 opacity-80" />
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    </div>
  );
}
```

---

## .env Güncelleme

`apps/ui/.env.local` (git ignore):
```
VITE_API_URL=http://localhost:3001
```

`apps/ui/.env.production`:
```
VITE_API_URL=https://api.geveze.app
```

---

## localStorage Temizliği

Faz 3 tamamlandıktan sonra kaldırılacaklar:

```
apps/ui/src/lib/gevezeStorageKeys.ts      → SİL
apps/ui/src/hooks/useGevezeStorage.ts     → SİL
```

App.tsx'den kaldırılacaklar:
- `loadInitialTasks()` fonksiyonu
- `loadInitialPortfolioCompanies()` fonksiyonu
- `loadTableColumnSchema()` fonksiyonu
- `loadTags()` fonksiyonu
- `loadServiceTypes()` fonksiyonu
- `loadTagServiceMap()` fonksiyonu
- Tüm `localStorage.setItem` ve `localStorage.getItem` çağrıları
- `clearGevezePersistedKeys()` çağrısı

`import`'lardan kaldırılacaklar:
```typescript
// Bu importlar artık gerekli değil:
import { GEVEZE_STORAGE_KEYS, ... } from '@/lib/gevezeStorageKeys';
import { clearGevezePersistedKeys } from '@/hooks/useGevezeStorage';
import { initialTasks } from '@/data/mockData';
import { portfolioCompanies as portfolioSeedCompanies } from '@/data/portfolioData';
```

---

## Tamamlanma Kriteri

- [ ] Uygulama açıldığında görevler API'dan yükleniyor
- [ ] Yeni görev → veritabanına yazılıyor, sayfa yenilemede korunuyor
- [ ] Görev güncelleme → veritabanında persiste ediliyor
- [ ] Görev silme → veritabanından kaldırılıyor
- [ ] Portföy CRUD → API üzerinden çalışıyor
- [ ] Etiket ekleme/silme → API üzerinden çalışıyor
- [ ] Tablo şeması değişikliği → `/api/settings/tableColumnSchema`'ya yazılıyor
- [ ] localStorage'a hiçbir iş verisi yazılmıyor
- [ ] Hata durumunda anlamlı toast mesajı gösteriliyor
- [ ] Optimistik güncelleme çalışıyor (hata durumunda geri alınıyor)
- [ ] Yükleme sırasında spinner görünüyor
- [ ] Tasarım ve tüm bileşenler değişmemiş
- [ ] TypeScript hata yok

## Dikkat Edilecekler

- `users` dizisi artık API'dan geldiği için `mockData.ts`'deki `users`
  importları kaldırılır; `state.users` kullanılır.
- `currentView` localStorage'da **kalabilir** — UI tercihi, backend
  gerektirmiyor.
- Attachment'lar hâlâ base64 — büyük dosyalar için S3 entegrasyonu
  ilerleyen fazda değerlendirilir.
- Turbo dev ile hem ui hem api çalışırken CORS hatası almamak için
  `apps/api/.env` içindeki `UI_ORIGIN` değerini kontrol et.
