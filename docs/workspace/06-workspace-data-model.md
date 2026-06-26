# 06 — Workspace Veri Modeli

## Mevcut MongoDB Koleksiyonları

```
geveze (database)
├── users         ← User dokümanları
├── tasks         ← Task dokümanları (soft-delete, archive)
├── portfolios    ← PortfolioCompany dokümanları
├── tags          ← Tag dokümanları
├── servicetypes  ← ServiceType dokümanları
└── settings      ← Key-value store (companyName vb.)
```

**Eksik:** `workspaces` koleksiyonu mevcut değil.

---

## Önerilen: Workspace Veri Modeli

### Workspace Dokümanı

```typescript
interface Workspace {
  id: string;           // MongoDB ObjectId string
  name: string;         // "Geveze Ajans"
  slug: string;         // "geveze-ajans" (URL-safe, unique)
  description?: string; // "Ajans iş takibi platformu"
  color: string;        // "#6161FF" (hex renk)
  icon?: string;        // emoji veya ikon adı: "⚡", "star", "briefcase"
  createdAt: string;    // ISO
  updatedAt: string;
  createdBy: string;    // userId
  members: WorkspaceMember[];
}
```

### WorkspaceMember Embedded Doküman

```typescript
interface WorkspaceMember {
  userId: string;
  role: 'workspace_admin' | 'workspace_manager' | 'workspace_member' | 'workspace_viewer';
  permissions: UserPermissions;  // granüler bayraklar (mevcut)
  joinedAt: string;              // ISO
  invitedBy?: string;            // userId
}
```

### Tasarım Kararı: Embed mi, Referans mı?

**Önerilen:** `members` alanı Workspace dokümanına **embed** edilir.

Gerekçe:
- Bir workspace'in üye sayısı genellikle < 100 (büyük organizasyon değil)
- Üye listesini workspace ile birlikte tek sorguda getirmek avantajlı
- Ayrı koleksiyon fazla JOIN (lookup) gerektirir

Sınır: Üye sayısı > 500 olursa ayrı koleksiyona taşınabilir.

---

## Kaynak Koleksiyonlarına workspaceId Eklenmesi

Tüm kaynak koleksiyonlarına `workspaceId` index'li alan eklenmelidir:

### tasks koleksiyonu

```typescript
// Mevcut TaskSchema'ya ekleme:
@Prop({ type: String, required: true, index: true })
workspaceId: string;
```

### portfolios koleksiyonu

```typescript
@Prop({ type: String, required: true, index: true })
workspaceId: string;
```

### tags koleksiyonu

```typescript
@Prop({ type: String, required: true, index: true })
workspaceId: string;
```

### servicetypes koleksiyonu

```typescript
@Prop({ type: String, required: true, index: true })
workspaceId: string;
```

### settings koleksiyonu

Mevcut key-value store değiştirilir:

```typescript
// Mevcut:
{ key: "companyName", value: "Geveze" }

// Önerilen (workspaceId scope):
{ key: "companyName", workspaceId: "ws_abc123", value: "Geveze" }

// Compound index:
{ key: 1, workspaceId: 1 } unique
```

---

## MongoDB Schema (NestJS Mongoose)

### WorkspaceSchema

```typescript
// apps/api/src/modules/workspace/schemas/workspace.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class WorkspaceMemberSchema {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true, enum: ['workspace_admin', 'workspace_manager', 'workspace_member', 'workspace_viewer'] })
  role: string;
  @Prop({ type: Object, default: () => DEFAULT_MEMBER_PERMISSIONS })
  permissions: Record<string, boolean>;
  @Prop({ default: Date.now }) joinedAt: Date;
  @Prop() invitedBy?: string;
}

@Schema({ timestamps: true, collection: 'workspaces' })
export class WorkspaceModel {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) slug: string;
  @Prop({ trim: true }) description?: string;
  @Prop({ required: true, default: '#6161FF' }) color: string;
  @Prop() icon?: string;
  @Prop({ required: true }) createdBy: string;
  @Prop({ type: [WorkspaceMemberSchema], default: [] })
  members: WorkspaceMemberSchema[];
}

// Compound index: workspace'e ait kaynakları hızlı sorgulamak için
WorkspaceSchema.index({ 'members.userId': 1 });
```

---

## TypeScript Tip Tanımları (packages/shared)

```typescript
// packages/shared/src/index.ts eklentisi

export type WorkspaceRole =
  | 'workspace_admin'
  | 'workspace_manager'
  | 'workspace_member'
  | 'workspace_viewer';

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  permissions: UserPermissions;
  joinedAt: string;
  invitedBy?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: WorkspaceMember[];
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface InviteMemberDto {
  userId: string;
  role?: WorkspaceRole;
}
```

---

## Mevcut Veriyle Migration Planı

### Adım 1: Default Workspace Oluşturma

```javascript
// MongoDB migration script
db.workspaces.insertOne({
  name: 'Geveze',  // veya db.settings.findOne({key:'companyName'}).value
  slug: 'default',
  color: '#6161FF',
  createdBy: '<first_admin_user_id>',
  members: [] // Adım 2'de doldurulacak
});
```

### Adım 2: Tüm Kullanıcıları Default Workspace'e Ekle

```javascript
const workspaceId = db.workspaces.findOne({slug:'default'})._id.toString();
const users = db.users.find().toArray();
const members = users.map(u => ({
  userId: u._id.toString(),
  role: u.role === 'admin' ? 'workspace_admin'
      : u.role === 'manager' ? 'workspace_manager'
      : 'workspace_member',
  permissions: u.permissions ?? DEFAULT_MEMBER_PERMISSIONS,
  joinedAt: u.createdAt,
}));
db.workspaces.updateOne({ slug: 'default' }, { $set: { members } });
```

### Adım 3: Mevcut Kaynaklara workspaceId Ekle

```javascript
const wsId = db.workspaces.findOne({slug:'default'})._id.toString();
db.tasks.updateMany({}, { $set: { workspaceId: wsId } });
db.portfolios.updateMany({}, { $set: { workspaceId: wsId } });
db.tags.updateMany({}, { $set: { workspaceId: wsId } });
db.servicetypes.updateMany({}, { $set: { workspaceId: wsId } });
```

---

## Index Stratejisi

### Yeni İndeksler

```typescript
// workspaces koleksiyonu
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ createdBy: 1 });

// tasks koleksiyonu (mevcut + yeni)
TaskSchema.index({ workspaceId: 1, status: 1 });        // filtre kombinasyonu
TaskSchema.index({ workspaceId: 1, assigneeId: 1 });
TaskSchema.index({ workspaceId: 1, deletedAt: 1 });

// portfolio
PortfolioSchema.index({ workspaceId: 1 });

// tags
TagSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

// servicetypes
ServiceTypeSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
```

---

## Veri Akışı (Sonra)

```
GET /api/workspaces/:workspaceId/tasks
  ↓ WorkspaceGuard: kullanıcı bu workspace'in üyesi mi?
  ↓ tasks.find({ workspaceId, ...filters })
  ↓ [Task[]]
  ↓ WorkspaceContext (frontend)
  ↓ TaskList component
```

---

## Board Soyutlaması (Opsiyonel Genişleme)

Eğer board soyutlaması eklenirse:

```typescript
interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: 'table' | 'board' | 'timeline' | 'calendar';  // default view
  createdAt: string;
  createdBy: string;
}

// Task şu da boardId alanı alır:
interface Task {
  // ...
  workspaceId: string;
  boardId?: string;  // hangi board'a ait, null ise genel havuz
}
```

→ Board scope'u ilk versiyon için kapsam dışı. Bkz. `11-open-questions.md`.
