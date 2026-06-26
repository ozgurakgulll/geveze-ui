import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { IsString } from 'class-validator';

class SetSettingDto {
  @IsString()
  key: string;

  value: unknown;
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll(@Query('workspaceId') workspaceId?: string): Promise<Record<string, unknown>> {
    return this.settingsService.getAll(workspaceId);
  }

  @Get(':key')
  get(
    @Param('key') key: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<unknown> {
    return this.settingsService.get(key, workspaceId);
  }

  @Put(':key')
  set(
    @Param('key') key: string,
    @Body() body: { value: unknown },
    @Query('workspaceId') workspaceId?: string,
  ): Promise<void> {
    return this.settingsService.set(key, body.value, workspaceId);
  }

  @Put()
  setMany(
    @Body() body: Record<string, unknown>,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<void> {
    return this.settingsService.setMany(body, workspaceId);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('key') key: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<void> {
    return this.settingsService.remove(key, workspaceId);
  }
}
