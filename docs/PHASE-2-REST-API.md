# Faz 2 — NestJS REST API

## Hedef

NestJS modülleri içinde tam CRUD controller ve service katmanlarını yaz.
Frontend'deki tüm localStorage operasyonlarını karşılayan endpoint'ler
`@geveze/shared` tiplerini referans alarak TypeScript güvencesiyle tamamlanır.

---

## Modül Yapısı & Sorumluluklar

| Modül | Prefix | Service Görevi |
|-------|--------|---------------|
| TasksModule | `/api/tasks` | CRUD + archive + attachment + bulk ops |
| UsersModule | `/api/users` | CRUD |
| PortfolioModule | `/api/portfolio-companies` | CRUD |
| TagsModule | `/api/tags` | list / add / remove |
| ServiceTypesModule | `/api/service-types` | list / add / remove |
| SettingsModule | `/api/settings` | key-value okuma/yazma |

---

## Tasks Modülü (Tam Implementasyon)

### tasks.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { TaskModel, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import type { Task } from '@geveze/shared';

export interface TaskFilters {
  archived?: boolean;
  assigneeId?: string;
  status?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(TaskModel.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findAll(filters: TaskFilters = {}): Promise<Task[]> {
    const query: FilterQuery<TaskDocument> = {};

    if (filters.archived !== undefined) {
      query.archived = filters.archived;
    } else {
      // Varsayılan: arşivlenmemişleri getir
      query.archived = false;
    }

    if (filters.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters.status) query.status = filters.status;

    const docs = await this.taskModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return docs.map(this.toTask);
  }

  async findById(id: string): Promise<Task> {
    const doc = await this.taskModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
    return this.toTask(doc);
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const doc = await this.taskModel.create({
      ...dto,
      progress: 0,
      archived: false,
      tags: dto.tags ?? [],
      customFields: dto.customFields ?? {},
      activityLog: [
        {
          id: `log-${Date.now()}`,
          date: new Date().toISOString(),
          author: 'System',
          action: 'Görev oluşturuldu',
          note: `"${dto.title}" oluşturuldu.`,
        },
      ],
    });
    return this.toTask(doc.toJSON());
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const existing = await this.taskModel.findById(id).exec();
    if (!existing) throw new NotFoundException(`Task ${id} bulunamadı`);

    Object.assign(existing, dto);
    const saved = await existing.save();
    return this.toTask(saved.toJSON());
  }

  async remove(id: string): Promise<void> {
    const result = await this.taskModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Task ${id} bulunamadı`);
  }

  async archive(id: string, archived: boolean): Promise<Task> {
    const doc = await this.taskModel
      .findByIdAndUpdate(
        id,
        {
          archived,
          $push: {
            activityLog: {
              id: `log-${Date.now()}`,
              date: new Date().toISOString(),
              author: 'System',
              action: archived ? 'Görev arşivlendi' : 'Arşivden çıkarıldı',
              note: archived ? 'Ana listeden gizlendi' : 'Ana listelere geri alındı',
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${id} bulunamadı`);
    return this.toTask(doc);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.taskModel.deleteMany({ _id: { $in: ids } }).exec();
  }

  async bulkReassign(ids: string[], assigneeId: string, assigneeName?: string): Promise<void> {
    await this.taskModel
      .updateMany(
        { _id: { $in: ids } },
        {
          assigneeId,
          assigneeName,
          $push: {
            activityLog: {
              id: `log-${Date.now()}`,
              date: new Date().toISOString(),
              author: 'System',
              action: 'Atanan kişi değiştirildi',
              note: `${assigneeName ?? assigneeId} kişisine devredildi (toplu)`,
            },
          },
        },
      )
      .exec();
  }

  async bulkArchive(ids: string[]): Promise<void> {
    await this.taskModel
      .updateMany(
        { _id: { $in: ids } },
        {
          archived: true,
          $push: {
            activityLog: {
              id: `log-${Date.now()}`,
              date: new Date().toISOString(),
              author: 'System',
              action: 'Görev arşivlendi',
              note: 'Ana listeden gizlendi (toplu)',
            },
          },
        },
      )
      .exec();
  }

  /** Seed için — mevcut kayıt varsa güncelle, yoksa oluştur */
  async upsert(task: Partial<Task>): Promise<void> {
    await this.taskModel
      .findOneAndUpdate(
        { title: task.title },
        task,
        { upsert: true, new: true },
      )
      .exec();
  }

  /** Mongoose dökümanını frontend Task tipine dönüştür */
  private toTask(doc: Record<string, unknown>): Task {
    const { _id, __v, ...rest } = doc as Record<string, unknown>;
    return { id: String(_id ?? rest['id']), ...rest } as unknown as Task;
  }
}
```

### tasks.controller.ts

```typescript
import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TasksService, TaskFilters } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import type { Task } from '@geveze/shared';

class BulkIdsDto {
  ids: string[];
}

class BulkReassignDto extends BulkIdsDto {
  assigneeId: string;
  assigneeName?: string;
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: TaskFilters & { archived?: string }): Promise<Task[]> {
    return this.tasksService.findAll({
      ...query,
      archived: query.archived !== undefined ? query.archived === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @Body() body: { archived: boolean },
  ): Promise<Task> {
    return this.tasksService.archive(id, body.archived);
  }

  @Patch('bulk/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkDelete(@Body() body: BulkIdsDto): Promise<void> {
    return this.tasksService.bulkDelete(body.ids);
  }

  @Patch('bulk/reassign')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkReassign(@Body() body: BulkReassignDto): Promise<void> {
    return this.tasksService.bulkReassign(body.ids, body.assigneeId, body.assigneeName);
  }

  @Patch('bulk/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkArchive(@Body() body: BulkIdsDto): Promise<void> {
    return this.tasksService.bulkArchive(body.ids);
  }
}
```

### tasks.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskModel, TaskSchema } from './schemas/task.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaskModel.name, schema: TaskSchema }]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```

---

## Diğer Modüller (Kısa Tanım)

### Users Modülü

Endpoint'ler:

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/users` | Tüm kullanıcılar |
| GET | `/api/users/:id` | Tek kullanıcı |
| POST | `/api/users` | Yeni kullanıcı |
| PUT | `/api/users/:id` | Güncelle |
| DELETE | `/api/users/:id` | Sil |

### Portfolio Modülü

Endpoint'ler:

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/portfolio-companies` | Tüm şirketler (status filtresi) |
| GET | `/api/portfolio-companies/:id` | Tek şirket |
| POST | `/api/portfolio-companies` | Yeni şirket |
| PUT | `/api/portfolio-companies/:id` | Güncelle |
| DELETE | `/api/portfolio-companies/:id` | Sil |

### Tags Modülü

Endpoint'ler:

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/tags` | Tüm etiketler |
| POST | `/api/tags` | Etiket ekle (body: `{name}`) |
| DELETE | `/api/tags/:name` | Etiket sil |

### Service Types Modülü

Tags ile aynı yapı, `/api/service-types` prefix'i ile.

### Settings Modülü

Endpoint'ler:

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/settings/:key` | Ayar değeri getir |
| PUT | `/api/settings/:key` | Ayar değeri güncelle |

Kullanılan key'ler:
- `tableColumnSchema` → tablo sütun düzeni
- `tagServiceMap` → tag → hizmet eşlemesi

---

## Hata Yönetimi

NestJS global exception filter ekle:

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@geveze/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string })?.message ?? exception.message
        : 'Internal server error';

    const body: ApiError = { statusCode: status, error: String(exception), message };
    response.status(status).json(body);
  }
}
```

`main.ts`'de ekle:
```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

---

## Endpoint Test Komutları

```bash
# Görev listesi
curl http://localhost:3001/api/tasks | jq 'length'

# Arşivlenmiş görevler
curl "http://localhost:3001/api/tasks?archived=true" | jq 'length'

# Yeni görev oluştur
curl -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","status":"brief","priority":"medium"}'

# Kullanıcılar
curl http://localhost:3001/api/users | jq '.[].name'

# Portföy şirketleri
curl http://localhost:3001/api/portfolio-companies | jq 'length'

# Etiketler
curl http://localhost:3001/api/tags | jq '.[].name'

# Ayar güncelle
curl -X PUT http://localhost:3001/api/settings/tagServiceMap \
  -H 'Content-Type: application/json' \
  -d '{"value":{"Post":"Sosyal Medya Yönetimi"}}'
```

---

## Tamamlanma Kriteri

- [ ] Tüm endpoint'ler doğru HTTP statüsleri dönüyor (200, 201, 204, 404)
- [ ] `GET /api/tasks` → seed verisi dönüyor
- [ ] `POST /api/tasks` → geçersiz veriyle 400 dönüyor (class-validator)
- [ ] `GET /api/users` → 6 kullanıcı dönüyor
- [ ] `GET /api/portfolio-companies` → 30 şirket dönüyor
- [ ] Hata formatı `ApiError` interface'iyle uyumlu
- [ ] `toJSON` transform → `_id` yerine `id` dönüyor, `__v` yok
- [ ] TypeScript hata yok
