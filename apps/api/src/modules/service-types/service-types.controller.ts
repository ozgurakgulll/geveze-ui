import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ServiceTypesService, ServiceTypeEntry } from './service-types.service';
import { IsString, MinLength } from 'class-validator';

class CreateServiceTypeDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly service: ServiceTypesService) {}

  @Get()
  findAll(@Query('workspaceId') workspaceId?: string): Promise<ServiceTypeEntry[]> {
    return this.service.findAll(workspaceId);
  }

  @Post()
  create(
    @Body() dto: CreateServiceTypeDto,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ServiceTypeEntry> {
    return this.service.create(dto.name, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateServiceTypeDto,
  ): Promise<ServiceTypeEntry> {
    return this.service.update(id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
