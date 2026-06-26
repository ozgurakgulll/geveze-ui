# 07 — Workspace API Planı

## Genel İlke

- Tüm workspace endpoint'leri `/api/workspaces` prefix'i altında toplanır
- Kaynak endpoint'leri (`/tasks`, `/portfolio` vb.) `workspaceId` path parametresi alır veya
  middleware ile workspace scope'u belirlenir
- `WorkspaceGuard` her istekte kullanıcının workspace üyeliğini doğrular

---

## Yeni Endpoint'ler

### 1. Workspace CRUD

```
GET    /api/workspaces                          → Kullanıcının üyesi olduğu workspace'ler
POST   /api/workspaces                          → Yeni workspace oluştur
GET    /api/workspaces/:workspaceId             → Workspace detayı (members dahil)
PATCH  /api/workspaces/:workspaceId             → Workspace bilgileri güncelle
DELETE /api/workspaces/:workspaceId             → Workspace sil (workspace_admin only)
```

### 2. Workspace Üye Yönetimi

```
GET    /api/workspaces/:workspaceId/members             → Üye listesi
POST   /api/workspaces/:workspaceId/members             → Üye ekle (userId + role)
PATCH  /api/workspaces/:workspaceId/members/:userId/role        → Rol değiştir
PATCH  /api/workspaces/:workspaceId/members/:userId/permissions → İzin güncelle
DELETE /api/workspaces/:workspaceId/members/:userId     → Üyeyi çıkar
```

### 3. Workspace Scoped Kaynaklar

```
GET  /api/workspaces/:workspaceId/tasks           → workspace task'ları (mevcut filter params ile)
POST /api/workspaces/:workspaceId/tasks           → task oluştur

GET  /api/workspaces/:workspaceId/portfolio       → workspace portföy şirketleri
POST /api/workspaces/:workspaceId/portfolio       → yeni portföy şirketi

GET  /api/workspaces/:workspaceId/tags            → workspace tag'leri
POST /api/workspaces/:workspaceId/tags            → yeni tag

GET  /api/workspaces/:workspaceId/service-types   → workspace servis türleri
POST /api/workspaces/:workspaceId/service-types   → yeni servis türü

GET  /api/workspaces/:workspaceId/settings        → workspace ayarları
PUT  /api/workspaces/:workspaceId/settings        → ayarları güncelle
```

---

## Request / Response Örnekleri

### POST /api/workspaces

```json
// Request body
{
  "name": "Yeni Ajans Workspace",
  "description": "Müşteri projeleri için",
  "color": "#A855F7",
  "icon": "briefcase"
}

// Response 201
{
  "id": "ws_673abc",
  "name": "Yeni Ajans Workspace",
  "slug": "yeni-ajanc-workspace",
  "description": "Müşteri projeleri için",
  "color": "#A855F7",
  "icon": "briefcase",
  "createdBy": "user_123",
  "createdAt": "2026-06-26T10:00:00Z",
  "members": [
    {
      "userId": "user_123",
      "role": "workspace_admin",
      "permissions": { "canViewAnalytics": true, ... },
      "joinedAt": "2026-06-26T10:00:00Z"
    }
  ]
}
```

### POST /api/workspaces/:workspaceId/members

```json
// Request body
{
  "userId": "user_456",
  "role": "workspace_member"
}

// Response 200
{
  "userId": "user_456",
  "role": "workspace_member",
  "permissions": { "canViewAnalytics": false, "canCreateTasks": true, ... },
  "joinedAt": "2026-06-26T11:00:00Z"
}
```

### GET /api/workspaces/:workspaceId/tasks

```
GET /api/workspaces/ws_673abc/tasks?status=in-progress&assigneeId=user_123
Authorization: Bearer <token>

// Response 200: Task[]  (mevcut format, workspaceId filtrelenmiş)
```

---

## NestJS Modül Yapısı

```
apps/api/src/modules/workspace/
├── workspace.module.ts
├── workspace.controller.ts       ← CRUD + üye yönetimi endpoint'leri
├── workspace.service.ts          ← İş mantığı
├── schemas/
│   └── workspace.schema.ts       ← WorkspaceModel + WorkspaceMemberSchema
├── guards/
│   └── workspace.guard.ts        ← WorkspaceGuard (üyelik kontrolü)
├── decorators/
│   └── workspace-roles.decorator.ts
└── dto/
    ├── create-workspace.dto.ts
    ├── update-workspace.dto.ts
    └── invite-member.dto.ts
```

---

## WorkspaceModule Yapısı

```typescript
// workspace.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceModel.name, schema: WorkspaceSchema },
    ]),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceGuard],
  exports: [WorkspaceService],  // TasksModule vb. import edebilir
})
export class WorkspaceModule {}
```

---

## WorkspaceController Taslağı

```typescript
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  findAll(@Request() req): Promise<Workspace[]> {
    return this.workspaceService.findByUser(req.user.id);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @Request() req): Promise<Workspace> {
    return this.workspaceService.create(dto, req.user.id);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard)
  findOne(@Param('workspaceId') id: string): Promise<Workspace> {
    return this.workspaceService.findById(id);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin')
  update(
    @Param('workspaceId') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaceService.update(id, dto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('workspaceId') id: string): Promise<void> {
    return this.workspaceService.remove(id);
  }

  // Üye yönetimi
  @Post(':workspaceId/members')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin')
  addMember(
    @Param('workspaceId') id: string,
    @Body() dto: InviteMemberDto,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.addMember(id, dto);
  }

  @Patch(':workspaceId/members/:userId/role')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin')
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body('role') role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.updateMemberRole(workspaceId, userId, role);
  }

  @Patch(':workspaceId/members/:userId/permissions')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin', 'workspace_manager')
  updateMemberPermissions(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.updateMemberPermissions(workspaceId, userId, dto.permissions);
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles('workspace_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.workspaceService.removeMember(workspaceId, userId);
  }
}
```

---

## Mevcut Endpoint'lere Etki

### Seçenek A: Prefix Ekleme (Önerilen)

Mevcut endpoint'ler yeni workspace prefix ile sarılır:

```
ÖNCE: GET /api/tasks
SONRA: GET /api/workspaces/:workspaceId/tasks
```

Avantaj: Açık izolasyon, RESTful  
Dezavantaj: Frontend'de tüm API çağrıları güncellenir

### Seçenek B: Middleware workspaceId (Alternatif)

Her request'e `X-Workspace-ID` header'ı eklenir. Middleware extract eder.

```typescript
// Global middleware
app.use((req, res, next) => {
  req.workspaceId = req.headers['x-workspace-id'] ?? 'default';
  next();
});
```

Avantaj: Mevcut URL'ler değişmez  
Dezavantaj: Gizli coupling, RESTful değil

**Karar:** Seçenek A önerilen. Ancak geçiş için Seçenek B geçici köprü olarak kullanılabilir.

---

## API Versiyonlama

```
/api/v1/workspaces/:workspaceId/tasks   ← yeni yapı
/api/tasks                               ← eski yapı (deprecation period)
```

Geçiş süreci tamamlanınca eski endpoint'ler kaldırılır.

---

## OpenAPI Dökümantasyon Notları

NestJS `@nestjs/swagger` ile Swagger UI:

```typescript
@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspaceController { ... }
```

Tüm DTO'lar `@ApiProperty()` ile belgelenmeli.
