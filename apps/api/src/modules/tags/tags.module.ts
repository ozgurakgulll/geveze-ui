import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagModel, TagSchema } from './schemas/tag.schema';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TagModel.name, schema: TagSchema }]),
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
