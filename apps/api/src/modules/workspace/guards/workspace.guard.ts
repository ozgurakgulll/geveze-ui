import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceService } from '../workspace.service';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';
import type { WorkspaceRole } from '@geveze/shared';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  workspace_admin: 4,
  workspace_manager: 3,
  workspace_member: 2,
  workspace_viewer: 1,
};

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user: { id: string; role: string };
      workspaceMember?: unknown;
    }>();

    const workspaceId = request.params['workspaceId'];
    if (!workspaceId) return true;

    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('Kimlik doğrulama gerekli');

    // Global admin her workspace'e erişebilir — üyelik sorgusu atla
    if (request.user.role === 'admin') {
      // workspace_admin yetkisiyle işaretle
      request.workspaceMember = { userId, role: 'workspace_admin' };
      return true;
    }

    const member = await this.workspaceService.getMember(workspaceId, userId);
    if (!member) throw new NotFoundException('Bu workspace\'e erişim yetkiniz yok');

    request.workspaceMember = member;

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const memberLevel = ROLE_HIERARCHY[member.role] ?? 0;
    const hasAccess = requiredRoles.some(
      (r) => memberLevel >= ROLE_HIERARCHY[r],
    );

    if (!hasAccess) {
      throw new ForbiddenException('Bu işlem için yeterli yekiniz yok');
    }

    return true;
  }
}
