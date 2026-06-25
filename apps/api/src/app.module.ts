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
    MongooseModule.forRoot(
      process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/geveze',
    ),
    TasksModule,
    UsersModule,
    PortfolioModule,
    TagsModule,
    ServiceTypesModule,
    SettingsModule,
  ],
})
export class AppModule {}
