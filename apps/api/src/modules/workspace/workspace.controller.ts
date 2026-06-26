import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceGuard } from './guards/workspace.guard';
import { WorkspaceRoles } from './decorators/workspace-roles.decorator';
import {
  IsString, IsOptional, MinLength, IsEnum,
} from 'class-validator';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  UserPermissions,
} from '@geveze/shared';

class CreateWorkspaceDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

class UpdateWorkspaceDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

class InviteMemberDto {
  @IsString() userId: string;
  @IsOptional()
  @IsEnum(['workspace_admin', 'workspace_manager', 'workspace_member', 'workspace_viewer'])
  role?: WorkspaceRole;
}

class UpdateRoleDto {
  @IsEnum(['workspace_admin', 'workspace_manager', 'workspace_member', 'workspace_viewer'])
  role: WorkspaceRole;
}

class UpdatePermissionsDto {
  permissions: Partial<UserPermissions>;
}

interface AuthRequest {
  user: { id: string; role: string };
  workspaceMember?: { role: WorkspaceRole };
}

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  findAll(@Request() req: AuthRequest): Promise<Workspace[]> {
    return this.workspaceService.findByUser(req.user.id);
  }

  @Post()
  create(
    @Body() dto: CreateWorkspaceDto,
    @Request() req: AuthRequest,
  ): Promise<Workspace> {
    return this.workspaceService.create(dto, req.user.id);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard)
  findOne(@Param('workspaceId') id: string): Promise<Workspace> {
    return this.workspaceService.findById(id);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_admin')
  update(
    @Param('workspaceId') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaceService.update(id, dto);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('workspaceId') id: string): Promise<void> {
    return this.workspaceService.remove(id);
  }

  // ── Üye yönetimi ────────────────────────────────────────────────────────────

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceGuard)
  async getMembers(@Param('workspaceId') id: string): Promise<WorkspaceMember[]> {
    const ws = await this.workspaceService.findById(id);
    return ws.members;
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_admin')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @Request() req: AuthRequest,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.addMember(
      workspaceId,
      dto.userId,
      dto.role,
      req.user.id,
    );
  }

  @Patch(':workspaceId/members/:userId/role')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_admin')
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.updateMemberRole(workspaceId, userId, dto.role);
  }

  @Patch(':workspaceId/members/:userId/permissions')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_manager')
  updateMemberPermissions(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePermissionsDto,
    @Request() req: AuthRequest,
  ): Promise<WorkspaceMember> {
    const requesterRole = req.workspaceMember?.role ?? 'workspace_viewer';
    return this.workspaceService.updateMemberPermissions(
      workspaceId,
      userId,
      dto.permissions,
      requesterRole,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceGuard)
  @WorkspaceRoles('workspace_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.workspaceService.removeMember(workspaceId, userId);
  }
}
