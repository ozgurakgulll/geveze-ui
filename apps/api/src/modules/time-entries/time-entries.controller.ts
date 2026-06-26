import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';
import type { TimeEntry, TimeEntryStats } from '@geveze/shared';

interface AuthRequest {
  user: { id: string; role: string };
}

@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  /** Aktif timer'ı getir */
  @Get('active')
  getActive(@Request() req: AuthRequest): Promise<TimeEntry | null> {
    return this.service.getActive(req.user.id);
  }

  /** Timer başlat */
  @Post('start')
  start(
    @Request() req: AuthRequest,
    @Body() body: {
      taskId: string;
      taskTitle: string;
      workspaceId?: string;
      portfolioCompanyId?: string;
    },
  ): Promise<TimeEntry> {
    return this.service.start(
      req.user.id,
      body.taskId,
      body.taskTitle,
      body.workspaceId,
      body.portfolioCompanyId,
    );
  }

  /** Aktif timer'ı durdur */
  @Patch('stop')
  stop(
    @Request() req: AuthRequest,
    @Body() body: { note?: string },
  ): Promise<TimeEntry> {
    return this.service.stop(req.user.id, body.note);
  }

  /** Manuel süre ekle */
  @Post('manual')
  createManual(
    @Request() req: AuthRequest,
    @Body() body: {
      taskId: string;
      taskTitle: string;
      minutes: number;
      date: string;
      note?: string;
      workspaceId?: string;
      portfolioCompanyId?: string;
    },
  ): Promise<TimeEntry> {
    return this.service.createManual(
      req.user.id,
      body.taskId,
      body.taskTitle,
      body.minutes,
      body.date,
      body.note,
      body.workspaceId,
      body.portfolioCompanyId,
    );
  }

  /** Göreve ait süreler */
  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string): Promise<TimeEntry[]> {
    return this.service.findByTask(taskId);
  }

  /** Kullanıcıya ait süreler */
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<TimeEntry[]> {
    return this.service.findByUser(userId, from, to, workspaceId);
  }

  /** İstatistik */
  @Get('stats')
  stats(
    @Query('workspaceId') workspaceId?: string,
    @Query('userId') userId?: string,
    @Query('portfolioCompanyId') portfolioCompanyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TimeEntryStats> {
    return this.service.stats({ workspaceId, userId, portfolioCompanyId, from, to });
  }

  /** Kayıt sil */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ): Promise<void> {
    const isAdmin = req.user.role === 'admin';
    return this.service.remove(id, req.user.id, isAdmin);
  }
}
