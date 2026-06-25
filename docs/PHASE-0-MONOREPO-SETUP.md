# Faz 0 — Turborepo Monorepo Kurulumu

## Hedef

Mevcut `geveze-ui` dizinini **Turborepo** ile yönetilen bir npm workspaces
monorepo'ya dönüştür. Tüm TypeScript dosyaları `.tsx/.ts` formatında,
arayüzler sağlam ve ortak tipler paylaşılan paketten gelecek şekilde kurulur.

## Son Yapı

```
geveze/                            ← repo kökü
├── turbo.json                     ← Turborepo pipeline tanımı
├── package.json                   ← workspace root (npm workspaces + turbo)
├── apps/
│   ├── ui/                        ← mevcut React uygulaması (dokunulmaz)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── api/               ← yeni: API istemci katmanı
│   │       ├── contexts/          ← yeni: AuthContext
│   │       └── ...mevcut dosyalar
│   └── api/                       ← yeni NestJS uygulaması
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── modules/
│           │   ├── tasks/
│           │   ├── users/
│           │   ├── portfolio/
│           │   ├── tags/
│           │   ├── service-types/
│           │   ├── settings/
│           │   └── auth/
│           └── common/
│               ├── schemas/       ← Mongoose şemaları
│               └── types/
├── packages/
│   └── shared/                    ← ortak TypeScript tipleri
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts           ← tüm interface'ler buradan export
└── .gitignore
```

---

## Adımlar

### 0.1 — Turborepo Kurulumu

```bash
# Kök package.json oluştur (mevcut package.json apps/ui'ya taşındıktan sonra)
npm install -D turbo -w
```

**`turbo.json`** (repo kökünde):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

**Kök `package.json`**:
```json
{
  "name": "geveze",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev":       "turbo dev",
    "build":     "turbo build",
    "lint":      "turbo lint",
    "typecheck": "turbo typecheck",
    "ui":        "turbo dev --filter=@geveze/ui",
    "api":       "turbo dev --filter=@geveze/api"
  },
  "devDependencies": {
    "turbo": "^2.x",
    "typescript": "~5.9.3"
  }
}
```

---

### 0.2 — packages/shared Kurulumu

Bu paket tüm interface'leri ve enum'ları tutar. Hem `apps/ui` hem `apps/api`
bu paketten import eder — tip tutarsızlığı ortadan kalkar.

**`packages/shared/package.json`**:
```json
{
  "name": "@geveze/shared",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "typescript": "~5.9.3"
  }
}
```

**`packages/shared/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`packages/shared/src/index.ts`** — mevcut `src/types/index.ts` içeriği
buraya taşınır ve genişletilir:

```typescript
// ─── Temel Tipler ─────────────────────────────────────────────
export type TaskStatus = 'brief' | 'in-progress' | 'review' | 'revision' | 'done';
export type Priority   = 'low' | 'medium' | 'high' | 'urgent';
export type ViewType   =
  | 'table' | 'portfolio' | 'board' | 'timeline'
  | 'dashboard' | 'calendar' | 'person' | 'analytics' | 'archive';
export type PortfolioStatus = 'active' | 'on-hold' | 'left';
export type PortfolioRole   = 'admin' | 'manager' | 'editor' | 'viewer';
export type CustomColumnType = 'text' | 'number' | 'date' | 'link' | 'priority' | 'status';

// ─── Küçük Arayüzler ──────────────────────────────────────────
export interface ActivityLogItem {
  id: string;
  date: string;
  author: string;
  action: string;
  note: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  uploadedAt: string;
}

export interface SocialMediaAccount {
  platform: string;
  handle: string;
  url: string;
  visibleTo: PortfolioRole[];
}

export interface BrandIdentity {
  logos: string[];
  logoAttachments?: TaskAttachment[];
  colorPalette: string[];
  fonts: string[];
  brandTone: string;
}

export interface CompanyContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface MonthlyContentQuota {
  video: number;
  post: number;
  story: number;
  render3d?: number;
}

export interface ContentCalendarItem {
  id: string;
  date: string;
  title: string;
  channel: string;
  status: 'planned' | 'in-production' | 'published';
}

export interface TableColumnSchemaItem {
  id: string;
  label: string;
  width?: string;
  type?: CustomColumnType | 'base';
}

// ─── Ana Varlıklar ────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  color: string;
  title?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: User;
  portfolioCompanyId?: string;
  portfolioCompanyName?: string;
  dueDate?: Date | string;
  tags: string[];
  progress: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  customFields?: Record<string, string>;
  activityLog?: ActivityLogItem[];
  attachments?: TaskAttachment[];
  archived?: boolean;
}

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  members: User[];
  columns: Column[];
  createdAt: Date | string;
}

export interface TimelineItem {
  id: string;
  taskId: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  progress: number;
  assignee?: User;
  status: TaskStatus;
  color: string;
}

export interface PortfolioCompany {
  id: string;
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: string[];
  monthlyQuotas: MonthlyContentQuota;
  socialMediaAccounts: SocialMediaAccount[];
  brandIdentity: BrandIdentity;
  contacts: CompanyContact[];
  assignedTeamMemberIds: string[];
  monthlyContentCalendar: ContentCalendarItem[];
  notes: string[];
  activityLog: ActivityLogItem[];
}

export interface PortfolioCompanyDraft {
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: string[];
  monthlyQuotas: MonthlyContentQuota;
  notes: string[];
  socialMediaAccounts?: SocialMediaAccount[];
  brandIdentity?: BrandIdentity;
  contacts?: CompanyContact[];
  assignedTeamMemberIds?: string[];
  monthlyContentCalendar?: ContentCalendarItem[];
}

export interface PortfolioCategoryGroup {
  letter: string;
  companies: PortfolioCompany[];
}

// ─── API DTO Tipleri ──────────────────────────────────────────
export interface CreateTaskDto {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  portfolioCompanyId?: string;
  dueDate?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
  archived?: boolean;
  activityLog?: ActivityLogItem[];
  attachments?: TaskAttachment[];
}

export interface CreatePortfolioCompanyDto extends PortfolioCompanyDraft {}
export interface UpdatePortfolioCompanyDto extends Partial<PortfolioCompanyDraft> {}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials'>;
}

// ─── API Yanıt Sarmalayıcıları ────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
```

---

### 0.3 — apps/ui Taşıma

1. Mevcut tüm dosyaları `apps/ui/` altına taşı.
2. `apps/ui/package.json`'ı güncelle — `@geveze/shared` bağımlılığı ekle:
   ```json
   {
     "name": "@geveze/ui",
     "dependencies": {
       "@geveze/shared": "*"
       // ... mevcut bağımlılıklar
     }
   }
   ```
3. `apps/ui/tsconfig.app.json`'da path alias:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@geveze/shared": ["../../packages/shared/src/index.ts"]
       }
     }
   }
   ```
4. `apps/ui/src/types/index.ts` → `@geveze/shared`'dan re-export:
   ```typescript
   export * from '@geveze/shared';
   ```
   Bu sayede mevcut `import ... from '@/types'` importları kırılmaz.

---

### 0.4 — apps/api Stub Oluşturma

NestJS CLI ile proje iskeletini oluştur:

```bash
cd apps
npx @nestjs/cli new api --package-manager npm --skip-git
```

Oluşturulan `apps/api/package.json`'a isim ve shared bağımlılığı ekle:
```json
{
  "name": "@geveze/api",
  "dependencies": {
    "@geveze/shared": "*"
    // ... nestjs bağımlılıkları
  }
}
```

`apps/api/package.json` scripts:
```json
{
  "scripts": {
    "dev":       "nest start --watch",
    "build":     "nest build",
    "start":     "node dist/main",
    "typecheck": "tsc --noEmit",
    "lint":      "eslint \"{src,apps,libs,test}/**/*.ts\""
  }
}
```

---

### 0.5 — .env Dosyaları

`apps/api/.env.example`:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/geveze
JWT_SECRET=change-this-in-production-minimum-32-chars
NODE_ENV=development
UI_ORIGIN=http://localhost:5173
```

`apps/ui/.env.example`:
```
VITE_API_URL=http://localhost:3001
```

`apps/api/.env` (git'e eklenmez):
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/geveze
JWT_SECRET=dev-secret-geveze-2024
NODE_ENV=development
UI_ORIGIN=http://localhost:5173
```

---

### 0.6 — Doğrulama

```bash
# Repo kökünde
npm install                  # tüm workspace'leri bağla
npm run ui                   # React dev server → localhost:5173
npm run api                  # NestJS → localhost:3001
npm run dev                  # her ikisi aynı anda (turbo)
npm run typecheck            # tüm paketlerde TS kontrolü
```

---

## Tamamlanma Kriteri

- [ ] `npm run ui` → mevcut uygulama port 5173'te açılıyor, tasarım değişmemiş
- [ ] `npm run api` → NestJS "Application is running on port 3001" mesajı
- [ ] `npm run dev` → turbo her ikisini paralel başlatıyor
- [ ] `npm run typecheck` → tüm paketlerde TypeScript hata yok
- [ ] `apps/ui/src/types/index.ts` → `@geveze/shared`'dan re-export ediyor
- [ ] `packages/shared/src/index.ts` → tüm interface'ler buradan geliyor
- [ ] Turbo cache çalışıyor (ikinci `turbo build` daha hızlı)

## Dikkat Edilecekler

- `apps/ui`'daki tüm interface'ler `@geveze/shared`'a taşınır; hiçbir tip
  tekrar tanımlanmaz.
- NestJS TypeScript konfigürasyonu `"experimentalDecorators": true` ve
  `"emitDecoratorMetadata": true` gerektirir — `apps/api/tsconfig.json`'da
  bu alanlar olmalı.
- Turborepo `dev` task'ı `"cache": false` ile işaretlenmeli çünkü
  geliştirme sunucuları cache'lenemez.
