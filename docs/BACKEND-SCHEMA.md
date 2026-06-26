# Geveze API — Backend Şema & Endpoint Referansı

> Güncelleme: 2026-06-26  
> Durum: Faz 1-4 tamamlandı (Auth + RBAC + Kullanıcı Yönetimi)

---

## İçindekiler
1. [Genel Bilgi](#genel-bilgi)
2. [Auth Modülü](#auth-modülü)
3. [Tasks Modülü](#tasks-modülü)
4. [Users Modülü](#users-modülü)
5. [Portfolio Modülü](#portfolio-modülü)
6. [Tags Modülü](#tags-modülü)
7. [Service Types Modülü](#service-types-modülü)
8. [Settings Modülü](#settings-modülü)
9. [Shared Types (packages/shared)](#shared-types)
10. [RBAC Kuralları](#rbac-kuralları)
11. [Veritabanı İndeksleri](#veritabanı-indeksleri)
12. [Seed Verisi](#seed-verisi)

---

## Genel Bilgi

| Özellik | Değer |
|---------|-------|
| Framework | NestJS + Mongoose |
| Veritabanı | MongoDB |
| Auth | JWT (Bearer token) |
| Base URL | `http://localhost:3001/api` |
| Guard Sırası | JwtAuthGuard → RolesGuard |

**Tüm endpoint'ler** (settings hariç) JWT token gerektirir.

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Auth Modülü

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/auth/login` | ❌ Public | Email + şifre ile giriş |

### POST /auth/login

**Request:**
```json
{ "email": "admin@geveze.com", "password": "geveze123" }
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6758a0001c2a3b4d5e6f7890",
    "name": "Efecan Dural",
    "email": "efecan@geveze.com",
    "color": "#45B7D1",
    "initials": "ED",
    "role": "admin"
  }
}
```

**❌ Eksik:**
- POST `/auth/logout` (token blacklist)
- POST `/auth/refresh` (token yenileme)
- GET `/auth/me` (mevcut kullanıcı)

---

## Tasks Modülü

### Schema — `tasks` koleksiyonu

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|---------|---------|----------|
| `id` | ObjectId → string | ✓ | — | MongoDB `_id` → `id` dönüşümü |
| `title` | string | ✓ | — | min 1 karakter |
| `description` | string | ✗ | — | — |
| `status` | TaskStatus | ✓ | `'brief'` | brief/in-progress/review/revision/done |
| `priority` | Priority | ✓ | `'medium'` | low/medium/high/urgent |
| `assigneeId` | string | ✗ | — | User ID (string) |
| `assigneeName` | string | ✗ | — | Göster: denormalized isim |
| `portfolioCompanyId` | string | ✗ | — | PortfolioCompany ID |
| `portfolioCompanyName` | string | ✗ | — | Denormalized isim |
| `dueDate` | Date | ✗ | — | Son teslim tarihi |
| `progress` | number | ✗ | `0` | 0–100 |
| `tags` | string[] | ✗ | `[]` | Etiket isimleri (string, ID değil) |
| `customFields` | Record<string,string> | ✗ | `{}` | Özel sütunlar |
| `archived` | boolean | ✗ | `false` | Arşivlenmiş mi |
| `deletedAt` | Date\|null | ✗ | `null` | Soft delete timestamp |
| `activityLog` | ActivityLogItem[] | ✗ | `[]` | Aktivite geçmişi |
| `attachments` | TaskAttachment[] | ✗ | `[]` | Dosya ekleri |
| `createdAt` | Date | auto | — | Mongoose timestamp |
| `updatedAt` | Date | auto | — | Mongoose timestamp |

#### ActivityLogItem
```typescript
{ id: string; date: string; author: string; action: string; note: string }
```

#### TaskAttachment
```typescript
{ id: string; name: string; type: string; size: number; data: string; uploadedAt: string }
// data: base64 encoded
```

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/tasks` | JWT | Görev listesi (filtrelenebilir) |
| GET | `/tasks/:id` | JWT | Tek görev |
| POST | `/tasks` | JWT | Yeni görev |
| PUT | `/tasks/:id` | JWT | Görev güncelle |
| DELETE | `/tasks/:id` | JWT | Soft delete (204) |
| GET | `/tasks/deleted` | JWT | Son 30 günün silinmiş görevleri |
| PATCH | `/tasks/:id/restore` | JWT | Silinen görevi kurtar |
| DELETE | `/tasks/:id/permanent` | JWT | Kalıcı sil (204) |
| PATCH | `/tasks/bulk/delete` | JWT | Toplu soft delete (204) |
| PATCH | `/tasks/bulk/reassign` | JWT | Toplu kullanıcı atama (204) |
| PATCH | `/tasks/bulk/archive` | JWT | Toplu arşivle (204) |
| PATCH | `/tasks/:id/archive` | JWT | Arşiv durumu değiştir |
| POST | `/tasks/:id/attachments` | JWT | Dosya ekle |
| DELETE | `/tasks/:id/attachments/:aid` | JWT | Dosya sil |

### GET /tasks — Query Parametreleri

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `archived` | `'true'`\|`'false'` | Arşiv filtresi |
| `assigneeId` | string | Atanan kullanıcı ID'si |
| `status` | string | Durum filtresi |

**❌ Eksik query params:**
- `portfolioCompanyId` — Şirkete göre görevler
- `dueDate[gte]` / `dueDate[lte]` — Tarih aralığı
- `tags` — Etiket filtresi
- `search` — Başlık/açıklama arama
- `priority` — Öncelik filtresi

---

## Users Modülü

### Schema — `users` koleksiyonu

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|---------|---------|----------|
| `id` | ObjectId → string | ✓ | — | — |
| `email` | string | ✓ | — | unique, lowercase |
| `name` | string | ✓ | — | — |
| `avatar` | string | ✗ | — | URL |
| `initials` | string | ✓ | — | max 3 karakter |
| `color` | string | ✓ | — | #RRGGBB format |
| `title` | string | ✗ | — | Ünvan |
| `role` | AppRole | ✓ | `'member'` | admin/manager/member |
| `permissions` | UserPermissions | ✓ | DEFAULT_MEMBER_PERMISSIONS | 7 boolean flag |
| `passwordHash` | string | ✗ | — | select:false (API'de gözükmez) |
| `createdAt` | Date | auto | — | — |
| `updatedAt` | Date | auto | — | — |

#### UserPermissions Şeması

| Flag | Default | Açıklama |
|------|---------|----------|
| `canViewAnalytics` | false | Analitik sayfasına erişim |
| `canViewArchive` | true | Arşiv sayfasına erişim |
| `canViewTrash` | true | Son silinenler sayfasına erişim |
| `canManagePortfolio` | false | Portföy yönetimi |
| `canCreateTasks` | true | Görev oluşturma |
| `canDeleteTasks` | false | Görev silme |
| `canEditOthersTasks` | false | Başkasının görevini düzenleme |

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/users` | JWT | Kullanıcı listesi |
| GET | `/users/:id` | JWT | Tek kullanıcı |
| POST | `/users` | admin/manager | Yeni kullanıcı oluştur |
| PUT | `/users/:id` | admin/manager | Profil güncelle |
| DELETE | `/users/:id` | admin/manager | Kullanıcı sil (204) |
| PATCH | `/users/:id/permissions` | admin/manager | İzinleri güncelle |
| PATCH | `/users/:id/password` | admin/manager | Şifre sıfırla (204) |
| PATCH | `/users/:id/role` | admin only | Rol değiştir |

---

## Portfolio Modülü

### Schema — `portfolio_companies` koleksiyonu

| Alan | Tip | Zorunlu | Default | Açıklama |
|------|-----|---------|---------|----------|
| `id` | ObjectId → string | ✓ | — | — |
| `name` | string | ✓ | — | Şirket adı |
| `status` | PortfolioStatus | ✓ | `'active'` | active/on-hold/left |
| `startDate` | string | ✓ | — | YYYY-MM-DD |
| `exitDate` | string | ✗ | — | YYYY-MM-DD |
| `servicesTaken` | string[] | ✗ | `[]` | Alınan hizmetler |
| `monthlyQuotas` | MonthlyContentQuota | ✓ | — | video/post/story/render3d |
| `notes` | string[] | ✗ | `[]` | Notlar |
| `assignedTeamMemberIds` | string[] | ✗ | `[]` | Atanan üye ID'leri |
| `brandIdentity` | BrandIdentity | ✗ | — | Marka kimliği |
| `socialMediaAccounts` | SocialMediaAccount[] | ✗ | `[]` | Sosyal medya hesapları |
| `contacts` | CompanyContact[] | ✗ | `[]` | İletişim kişileri |
| `monthlyContentCalendar` | ContentCalendarItem[] | ✗ | `[]` | Aylık içerik takvimi |
| `activityLog` | ActivityLogItem[] | ✗ | `[]` | Aktivite logu |
| `createdAt` | Date | auto | — | — |
| `updatedAt` | Date | auto | — | — |

#### Alt Yapılar

**MonthlyContentQuota:**
```typescript
{ video: number; post: number; story: number; render3d?: number }
```

**BrandIdentity:**
```typescript
{
  logos: string[];
  logoAttachments?: TaskAttachment[];
  colorPalette: string[];
  fonts: string[];
  brandTone: string;
}
```

**SocialMediaAccount:**
```typescript
{ platform: string; handle: string; url: string; visibleTo: PortfolioRole[] }
```

**CompanyContact:**
```typescript
{ name: string; role: string; email: string; phone: string }
```

**ContentCalendarItem:**
```typescript
{ id: string; date: string; title: string; channel: string; status: 'planned'|'in-production'|'published' }
```

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/portfolio` | JWT | Şirket listesi |
| GET | `/portfolio/:id` | JWT | Tek şirket |
| POST | `/portfolio` | JWT | Yeni şirket |
| PUT | `/portfolio/:id` | JWT | Şirket güncelle (tam) |
| DELETE | `/portfolio/:id` | JWT | Şirket sil (204) |

**❌ Eksik (UI'ın ihtiyaç duyduğu):**
- PATCH `/portfolio/:id/brand` — Sadece marka kimliği güncelle
- PATCH `/portfolio/:id/contacts` — Kişi ekle/güncelle/sil
- PATCH `/portfolio/:id/social-media` — Sosyal medya hesap yönetimi
- PATCH `/portfolio/:id/calendar` — Takvim item yönetimi
- GET `/portfolio?status=active` — Status filtresi
- GET `/portfolio?search=<q>` — İsim araması

---

## Tags Modülü

### Schema — `tags` koleksiyonu

| Alan | Tip | Zorunlu | Default |
|------|-----|---------|---------|
| `id` | ObjectId → string | ✓ | — |
| `name` | string | ✓ | — | unique |
| `color` | string | ✓ | `'#6161FF'` | hex renk |

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/tags` | JWT | Etiket listesi |
| POST | `/tags` | JWT | Yeni etiket |
| DELETE | `/tags/:id` | JWT | Etiket sil (204) |

**❌ Eksik:** PATCH `/tags/:id` — İsim/renk güncelleme

---

## Service Types Modülü

### Schema — `service_types` koleksiyonu

| Alan | Tip | Zorunlu |
|------|-----|---------|
| `id` | ObjectId → string | ✓ |
| `name` | string | ✓ | unique |

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/service-types` | JWT | Hizmet tipi listesi |
| POST | `/service-types` | JWT | Yeni hizmet tipi |
| DELETE | `/service-types/:id` | JWT | Sil (204) |

**❌ Eksik:** PATCH `/service-types/:id` — İsim güncelleme

---

## Settings Modülü

### Schema — `settings` koleksiyonu

| Alan | Tip | Zorunlu |
|------|-----|---------|
| `id` | ObjectId → string | ✓ |
| `key` | string | ✓ | unique |
| `value` | any (JSON) | ✗ |

### Endpoint'ler

| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/settings` | JWT | Tüm ayarlar (key-value map) |
| GET | `/settings/:key` | JWT | Tek ayar |
| PUT | `/settings/:key` | JWT | Tek ayar yaz |
| PUT | `/settings` | JWT | Çoklu ayar yaz |
| DELETE | `/settings/:key` | JWT | Ayar sil (204) |

**⚠️ ÖNEMLİ:** UI (`api.ts`) bu modülü **hiç kullanmıyor**.

### Mevcut Seed Ayarları

| Key | Value | Açıklama |
|-----|-------|----------|
| `companyName` | `"Geveze Ajans"` | Şirket/proje adı |
| `defaultCurrency` | `"TRY"` | Para birimi |
| `workingDays` | `["Pazartesi",...,"Cuma"]` | Çalışma günleri |

---

## Shared Types

`packages/shared/src/index.ts` — UI ve API'nin ortak kullandığı tipler.

```typescript
// Temel Union'lar
type TaskStatus = 'brief' | 'in-progress' | 'review' | 'revision' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type AppRole = 'admin' | 'manager' | 'member'
type PortfolioStatus = 'active' | 'on-hold' | 'left'
type PortfolioRole = 'admin' | 'manager' | 'editor' | 'viewer'
type ViewType = 'table'|'portfolio'|'board'|'timeline'|'dashboard'|'calendar'|'person'|'analytics'|'archive'|'trash'|'users'

// Temel Interface'ler: User, Task, Column, Project, TimelineItem
// PortfolioCompany ve alt tipleri
// DTO'lar: CreateTaskDto, UpdateTaskDto, CreatePortfolioCompanyDto, LoginDto, AuthResponse
// UserPermissions + DEFAULT_MEMBER_PERMISSIONS
```

---

## RBAC Kuralları

```
public     → POST /auth/login
JWT only   → GET /tasks, GET /users, GET /portfolio, GET /tags, GET /service-types, GET /settings, ...
admin/manager → POST /users, PUT /users/:id, DELETE /users/:id, PATCH /users/:id/permissions, PATCH /users/:id/password
admin only → PATCH /users/:id/role
```

**Mevcut boşluklar:**
- Tasks endpoint'leri rol kontrol içermiyor (herkes yazabilir)
- Portfolio endpoint'leri rol kontrol içermiyor
- Tags/ServiceTypes endpoint'leri rol kontrol içermiyor

---

## Veritabanı İndeksleri

### Tasks
```
status: 1, assigneeId: 1, archived: 1, dueDate: 1, portfolioCompanyId: 1, deletedAt: 1
```

### Portfolio Companies
```
status: 1, name: text (full-text search)
```

---

## Seed Verisi

### Kullanıcılar (6 kayıt)
| İsim | Email | Rol | Şifre |
|------|-------|-----|-------|
| Efecan Dural | efecan@geveze.com | admin | geveze123 |
| Kazım Gün | kazim@geveze.com | admin | geveze123 |
| Tuğçe Altıparmak | tugce@geveze.com | manager | geveze123 |
| Nihat Birgül | nihat@geveze.com | member | geveze123 |
| Selena Serfiçeli | selena@geveze.com | member | geveze123 |
| Metin Onur | metin@geveze.com | member | geveze123 |

### Tags (8 kayıt)
Post, Story, Video, Tasarım, Kampanya, Analiz, Müşteri, Onay

### Service Types (10 kayıt)
Sosyal Medya Yönetimi, Grafik Tasarım, Video Prodüksiyon, İçerik Yazarlığı, Web Geliştirme, SEO, Performance Marketing, Influencer Marketing, Kurumsal Kimlik, İç Projeler

### Portfolio Companies (3 kayıt)
TechStart AŞ (active), GreenEarth Organics (active), MediCare Klinik (on-hold)

### Tasks (38 kayıt)
8 temel + 30 test görevi (Şub-Nisan 2026)

### Settings (3 kayıt)
companyName: "Geveze Ajans", defaultCurrency: "TRY", workingDays: [...]
