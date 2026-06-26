import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TagsModule } from './modules/tags/tags.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/geveze',
    ),
    AuthModule,
    TasksModule,
    UsersModule,
    PortfolioModule,
    TagsModule,
    ServiceTypesModule,
    SettingsModule,
    WorkspaceModule,
    TimeEntriesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
