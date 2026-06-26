import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { DEFAULT_MEMBER_PERMISSIONS } from '@/types';
import type { WorkspaceRole } from '@/types';

export interface WorkspacePermissions {
  role: WorkspaceRole;
  isAdmin: boolean;
  isManager: boolean;
  canViewAnalytics: boolean;
  canViewArchive: boolean;
  canViewTrash: boolean;
  canManagePortfolio: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canEditOthersTasks: boolean;
}

export function useWorkspacePermissions(): WorkspacePermissions {
  const { user: authUser } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useMemo(() => {
    const member = currentWorkspace?.members.find(m => m.userId === authUser?.id);
    const role: WorkspaceRole = member?.role ?? 'workspace_viewer';
    const perms = member?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;

    const isAdmin = role === 'workspace_admin';
    const isManager = isAdmin || role === 'workspace_manager';

    return {
      role,
      isAdmin,
      isManager,
      canViewAnalytics:   isManager || perms.canViewAnalytics,
      canViewArchive:     isManager || perms.canViewArchive,
      canViewTrash:       isManager || perms.canViewTrash,
      canManagePortfolio: isManager || perms.canManagePortfolio,
      canCreateTasks:     isManager || perms.canCreateTasks,
      canDeleteTasks:     isManager || perms.canDeleteTasks,
      canEditOthersTasks: isManager || perms.canEditOthersTasks,
    };
  }, [authUser?.id, currentWorkspace]);
}
