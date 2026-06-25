import {
  Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TagsService, TagEntry } from './tags.service';
import { IsString, MinLength } from 'class-validator';

class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;
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
    return this.tagsService.create(dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.tagsService.remove(id);
  }
}
