import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsArray,
  ValidateNested,
  IsString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';
import type { ActivityLogItem, TaskAttachment } from '@geveze/shared';

class ActivityLogItemDto {
  @IsString() id: string;
  @IsString() date: string;
  @IsString() author: string;
  @IsString() action: string;
  @IsString() note: string;
}

class TaskAttachmentDto {
  @IsString() id: string;
  @IsString() name: string;
  @IsString() type: string;
  @IsNumber() size: number;
  @IsString() data: string;
  @IsString() uploadedAt: string;
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityLogItemDto)
  activityLog?: ActivityLogItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAttachmentDto)
  attachments?: TaskAttachment[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}
