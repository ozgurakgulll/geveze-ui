# Faz 1 — Backend: NestJS Modülleri & MongoDB Şemaları

## Hedef

`apps/api` içinde NestJS modüler mimarisi ve Mongoose şemalarıyla tam
veritabanı katmanını oluştur. `@geveze/shared`'dan gelen interface'ler
hem Mongoose şemalarına hem NestJS DTO'larına zemin oluşturur.

## Bağımlılıklar

```bash
# apps/api içinde
npm install @nestjs/mongoose mongoose
npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/mapped-types
```

---

## Dizin Yapısı

```
apps/api/src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── tasks/
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   ├── schemas/
│   │   │   └── task.schema.ts
│   │   └── dto/
│   │       ├── create-task.dto.ts
│   │       └── update-task.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── schemas/
│   │   │   └── user.schema.ts
│   │   └── dto/
│   │       └── create-user.dto.ts
│   ├── portfolio/
│   │   ├── portfolio.module.ts
│   │   ├── portfolio.controller.ts
│   │   ├── portfolio.service.ts
│   │   ├── schemas/
│   │   │   └── portfolio-company.schema.ts
│   │   └── dto/
│   │       ├── create-portfolio-company.dto.ts
│   │       └── update-portfolio-company.dto.ts
│   ├── tags/
│   │   ├── tags.module.ts
│   │   ├── tags.controller.ts
│   │   ├── tags.service.ts
│   │   └── schemas/
│   │       └── tag.schema.ts
│   ├── service-types/
│   │   ├── service-types.module.ts
│   │   ├── service-types.controller.ts
│   │   ├── service-types.service.ts
│   │   └── schemas/
│   │       └── service-type.schema.ts
│   ├── settings/
│   │   ├── settings.module.ts
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   └── schemas/
│   │       └── setting.schema.ts
│   └── auth/              ← Faz 4'te doldurulacak (stub bırakılır)
│       ├── auth.module.ts
│       └── auth.service.ts
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts (Faz 4)
│   └── pipes/
│       └── validation.pipe.ts
└── seed/
    └── seed.ts
```

---

## Mongoose Şemaları

### task.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  TaskStatus,
  Priority,
  ActivityLogItem,
  TaskAttachment,
} from '@geveze/shared';

export type TaskDocument = HydratedDocument<TaskModel>;

@Schema({ timestamps: true, collection: 'tasks' })
export class TaskModel {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: ['brief', 'in-progress', 'review', 'revision', 'done'] as TaskStatus[],
    default: 'brief',
  })
  status: TaskStatus;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'] as Priority[],
    default: 'medium',
  })
  priority: Priority;

  /** MongoDB ObjectId referansı — populate için */
  @Prop({ type: String, ref: 'UserModel' })
  assigneeId?: string;

  /** Denormalize isim — populate olmadan göstermek için */
  @Prop()
  assigneeName?: string;

  @Prop()
  portfolioCompanyId?: string;

  @Prop()
  portfolioCompanyName?: string;

  @Prop()
  dueDate?: Date;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  customFields: Record<string, string>;

  @Prop({ default: false })
  archived: boolean;

  @Prop({
    type: [
      {
        id: String,
        date: String,
        author: String,
        action: String,
        note: String,
      },
    ],
    default: [],
  })
  activityLog: ActivityLogItem[];

  @Prop({
    type: [
      {
        id: String,
        name: String,
        type: String,
        size: Number,
        data: String,
        uploadedAt: String,
      },
    ],
    default: [],
  })
  attachments: TaskAttachment[];

  // timestamps: true → createdAt, updatedAt otomatik eklenir
  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(TaskModel);

// İndeksler
TaskSchema.index({ status: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ archived: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ portfolioCompanyId: 1 });
```

### user.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({ timestamps: true, collection: 'users' })
export class UserModel {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  avatar?: string;

  @Prop({ required: true, maxlength: 3 })
  initials: string;

  @Prop({ required: true, match: /^#[0-9A-Fa-f]{6}$/ })
  color: string;

  @Prop()
  title?: string;

  /** select: false → sorgu sonuçlarına dahil edilmez */
  @Prop({ select: false })
  passwordHash?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
```

### portfolio-company.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  PortfolioStatus,
  MonthlyContentQuota,
  SocialMediaAccount,
  BrandIdentity,
  CompanyContact,
  ContentCalendarItem,
  ActivityLogItem,
} from '@geveze/shared';

export type PortfolioCompanyDocument = HydratedDocument<PortfolioCompanyModel>;

@Schema({ timestamps: true, collection: 'portfolio_companies' })
export class PortfolioCompanyModel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: ['active', 'on-hold', 'left'] as PortfolioStatus[],
    default: 'active',
  })
  status: PortfolioStatus;

  @Prop({ required: true })
  startDate: string;

  @Prop()
  exitDate?: string;

  @Prop({ type: [String], default: [] })
  servicesTaken: string[];

  @Prop({ type: Object, required: true })
  monthlyQuotas: MonthlyContentQuota;

  @Prop({ type: [String], default: [] })
  notes: string[];

  @Prop({ type: [String], default: [] })
  assignedTeamMemberIds: string[];

  @Prop({ type: Object })
  brandIdentity: BrandIdentity;

  @Prop({ type: [Object], default: [] })
  socialMediaAccounts: SocialMediaAccount[];

  @Prop({ type: [Object], default: [] })
  contacts: CompanyContact[];

  @Prop({ type: [Object], default: [] })
  monthlyContentCalendar: ContentCalendarItem[];

  @Prop({ type: [Object], default: [] })
  activityLog: ActivityLogItem[];

  createdAt: Date;
  updatedAt: Date;
}

export const PortfolioCompanySchema = SchemaFactory.createForClass(PortfolioCompanyModel);

PortfolioCompanySchema.index({ status: 1 });
PortfolioCompanySchema.index({ name: 'text' });
```

### tag.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<TagModel>;

@Schema({ timestamps: true, collection: 'tags' })
export class TagModel {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const TagSchema = SchemaFactory.createForClass(TagModel);
```

### service-type.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceTypeDocument = HydratedDocument<ServiceTypeModel>;

@Schema({ timestamps: true, collection: 'service_types' })
export class ServiceTypeModel {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const ServiceTypeSchema = SchemaFactory.createForClass(ServiceTypeModel);
```

### setting.schema.ts

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingDocument = HydratedDocument<SettingModel>;

/** key-value ayar deposu: tableColumnSchema, tagServiceMap vb. */
@Schema({ timestamps: true, collection: 'settings' })
export class SettingModel {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object })
  value: unknown;
}

export const SettingSchema = SchemaFactory.createForClass(SettingModel);
```

---

## DTO'lar

DTO'lar `class-validator` dekoratörleriyle doğrulama sağlar ve
`@geveze/shared`'dan gelen tiplerle birebir örtüşür.

### create-task.dto.ts

```typescript
import {
  IsString, IsEnum, IsOptional, IsArray,
  IsBoolean, IsDateString, IsNumber, Min, Max, IsObject,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import type { TaskStatus, Priority } from '@geveze/shared';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['brief', 'in-progress', 'review', 'revision', 'done'])
  status: TaskStatus;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: Priority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  portfolioCompanyId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
```

### create-portfolio-company.dto.ts

```typescript
import {
  IsString, IsEnum, IsOptional, IsArray,
  IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import type { PortfolioStatus } from '@geveze/shared';

class MonthlyQuotasDto {
  @IsNumber() video: number;
  @IsNumber() post: number;
  @IsNumber() story: number;
  @IsOptional() @IsNumber() render3d?: number;
}

export class CreatePortfolioCompanyDto {
  @IsString() name: string;

  @IsEnum(['active', 'on-hold', 'left'])
  status: PortfolioStatus;

  @IsString() startDate: string;

  @IsOptional() @IsString() exitDate?: string;

  @IsArray() @IsString({ each: true })
  servicesTaken: string[];

  @ValidateNested()
  @Type(() => MonthlyQuotasDto)
  monthlyQuotas: MonthlyQuotasDto;

  @IsOptional() @IsArray() @IsString({ each: true })
  notes?: string[];
}

export class UpdatePortfolioCompanyDto extends PartialType(CreatePortfolioCompanyDto) {}
```

---

## app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TagsModule } from './modules/tags/tags.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/geveze'),
    TasksModule,
    UsersModule,
    PortfolioModule,
    TagsModule,
    ServiceTypesModule,
    SettingsModule,
  ],
})
export class AppModule {}
```

---

## main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global doğrulama pipe'ı
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // DTO'da olmayan alanları siler
      forbidNonWhitelisted: true,
      transform: true,         // string → number/boolean dönüşümü
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.UI_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`NestJS API is running on http://localhost:${port}/api`);
}

bootstrap();
```

---

## Seed (seed/seed.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { TasksService } from '../modules/tasks/tasks.service';
import { PortfolioService } from '../modules/portfolio/portfolio.service';
import { TagsService } from '../modules/tags/tags.service';
import { ServiceTypesService } from '../modules/service-types/service-types.service';
// Mock veriler
import { users, initialTasks } from './mock-data';
import { portfolioCompanies } from './portfolio-mock';
import { DEFAULT_TAGS, DEFAULT_SERVICE_TYPES } from './defaults';

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService     = app.get(UsersService);
  const tasksService     = app.get(TasksService);
  const portfolioService = app.get(PortfolioService);
  const tagsService      = app.get(TagsService);
  const stService        = app.get(ServiceTypesService);

  console.log('Seeding users...');
  await Promise.all(users.map(u => usersService.upsert(u)));

  console.log('Seeding tasks...');
  await Promise.all(initialTasks.map(t => tasksService.upsert(t)));

  console.log('Seeding portfolio companies...');
  await Promise.all(portfolioCompanies.map(c => portfolioService.upsert(c)));

  console.log('Seeding tags...');
  await Promise.all(DEFAULT_TAGS.map(name => tagsService.upsert(name)));

  console.log('Seeding service types...');
  await Promise.all(DEFAULT_SERVICE_TYPES.map(name => stService.upsert(name)));

  console.log('Seed tamamlandı.');
  await app.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
```

`apps/api/package.json`'a ekle:
```json
"seed": "ts-node -r tsconfig-paths/register src/seed/seed.ts"
```

---

## Tamamlanma Kriteri

- [ ] `npm run dev -w apps/api` → MongoDB bağlantısı başarılı ("Connected to MongoDB")
- [ ] MongoDB'de `tasks`, `users`, `portfolio_companies`, `tags`, `service_types`,
      `settings` koleksiyonları oluşuyor
- [ ] `npm run seed -w apps/api` → tüm mock veri MongoDB'ye yazılıyor
- [ ] Mongoose şema doğrulaması çalışıyor (hatalı veri reddediliyor)
- [ ] DTO doğrulaması çalışıyor (`class-validator`)
- [ ] TypeScript hata yok (`npm run typecheck`)

## Dikkat Edilecekler

- `experimentalDecorators: true` ve `emitDecoratorMetadata: true` 
  `apps/api/tsconfig.json`'da **zorunlu**.
- `reflect-metadata` `main.ts`'de **ilk import** olmalı
  (NestJS genellikle bunu kendi içinde halleder, ama kontrol et).
- Mongoose `_id` alanı varsayılan olarak `ObjectId` üretir; frontend'e
  `id` olarak göndermek için schema `toJSON` transform ekle:
  ```typescript
  TaskSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => { delete ret._id; delete ret.__v; return ret; },
  });
  ```
- `passwordHash` alanı `select: false` olduğu için normal
  sorgu sonuçlarına dahil edilmez — güvenlik sağlanmış olur.
