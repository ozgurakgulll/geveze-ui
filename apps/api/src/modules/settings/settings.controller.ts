import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
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
  getAll(): Promise<Record<string, unknown>> {
    return this.settingsService.getAll();
  }

  @Get(':key')
  get(@Param('key') key: string): Promise<unknown> {
    return this.settingsService.get(key);
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() body: { value: unknown }): Promise<void> {
    return this.settingsService.set(key, body.value);
  }

  @Put()
  setMany(@Body() body: Record<string, unknown>): Promise<void> {
    return this.settingsService.setMany(body);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('key') key: string): Promise<void> {
    return this.settingsService.remove(key);
  }
}
