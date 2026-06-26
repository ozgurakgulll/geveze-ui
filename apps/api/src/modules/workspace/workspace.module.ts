import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspaceModel, WorkspaceSchema } from './schemas/workspace.schema';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceGuard } from './guards/workspace.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceModel.name, schema: WorkspaceSchema },
    ]),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceGuard],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
