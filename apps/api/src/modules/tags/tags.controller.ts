import {
  Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TagsService, TagEntry } from './tags.service';
import { IsString, MinLength, IsOptional } from 'class-validator';

class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(4)
  color: string;
}

class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  color?: string;
}

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(): Promise<TagEntry[]> {
    return this.tagsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateTagDto): Promise<TagEntry> {
    return this.tagsService.create(dto.name, dto.color);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto): Promise<TagEntry> {
    return this.tagsService.update(id, dto.name, dto.color);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.tagsService.remove(id);
  }
}
