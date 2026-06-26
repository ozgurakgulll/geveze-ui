import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { AppRole } from '@geveze/shared';
import { TasksService, TaskFilters } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import type { Task } from '@geveze/shared';

class BulkIdsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

class BulkReassignDto extends BulkIdsDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsString()
  assigneeName?: string;
}

class ArchiveDto {
  @IsBoolean()
  archived: boolean;
}

class AddAttachmentDto {
  @IsString() id: string;
  @IsString() name: string;
  @IsString() type: string;
  @IsString() data: string;
  @IsString() uploadedAt: string;
  size: number;
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Request() req: { user: { id: string; role: AppRole } },
    @Query('archived') archived?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
  ): Promise<Task[]> {
    const effectiveAssigneeId = assigneeId;
    const filters: TaskFilters = {
      ...(archived !== undefined ? { archived: archived === 'true' } : {}),
      ...(effectiveAssigneeId ? { assigneeId: effectiveAssigneeId } : {}),
      ...(status ? { status } : {}),
    };
    return this.tasksService.findAll(filters);
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

  @Get('deleted')
  findDeleted(): Promise<Task[]> {
    return this.tasksService.findDeleted();
  }

  @Patch(':id/restore')
  restoreDeleted(@Param('id') id: string): Promise<Task> {
    return this.tasksService.restoreDeleted(id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  permanentDelete(@Param('id') id: string): Promise<void> {
    return this.tasksService.permanentDelete(id);
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

  @Patch(':id/archive')
  setArchived(@Param('id') id: string, @Body() body: ArchiveDto): Promise<Task> {
    return this.tasksService.setArchived(id, body.archived);
  }

  @Post(':id/attachments')
  addAttachment(
    @Param('id') taskId: string,
    @Body() dto: AddAttachmentDto,
  ): Promise<Task> {
    return this.tasksService.addAttachment(taskId, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  removeAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<Task> {
    return this.tasksService.removeAttachment(taskId, attachmentId);
  }
}
