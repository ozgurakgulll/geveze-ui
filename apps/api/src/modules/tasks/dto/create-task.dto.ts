import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  IsObject,
  MinLength,
} from 'class-validator';
import type { TaskStatus, Priority } from '@geveze/shared';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
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
  workspaceId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  assigneeName?: string;

  @IsOptional()
  @IsString()
  portfolioCompanyId?: string;

  @IsOptional()
  @IsString()
  portfolioCompanyName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

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
