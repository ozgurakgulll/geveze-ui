import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  UserPermissions,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from '@/types';
import * as api from '@/lib/api';
import { useAuth } from './AuthContext';

const LAST_WORKSPACE_KEY = 'geveze.lastWorkspaceId';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  setCurrentWorkspaceById: (id: string) => void;
  createWorkspace: (dto: CreateWorkspaceDto) => Promise<Workspace>;
  updateWorkspace: (id: string, dto: UpdateWorkspaceDto) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  addMember: (userId: string, role?: WorkspaceRole) => Promise<WorkspaceMember>;
  updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<WorkspaceMember>;
  updateMemberPermissions: (userId: string, perms: Partial<UserPermissions>) => Promise<WorkspaceMember>;
  removeMember: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // URL'den gelen ID'yi yükleme tamamlanmadan önce talep edildiğinde sakla
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!token) { setIsLoading(false); return; }
    try {
      const list = await api.getWorkspaces();
      setWorkspaces(list);

      // pendingId varsa onu, yoksa localStorage'ı, yoksa ilkini seç
      const preferred = pendingId ?? localStorage.getItem(LAST_WORKSPACE_KEY);
      const target = list.find(w => w.id === preferred) ?? list[0] ?? null;
      setCurrentWorkspace(target);
      if (target) localStorage.setItem(LAST_WORKSPACE_KEY, target.id);
    } catch {
      setWorkspaces([]);
      setCurrentWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, pendingId]);

  useEffect(() => { void fetchWorkspaces(); }, [fetchWorkspaces]);

  const setCurrentWorkspaceById = useCallback((id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      setCurrentWorkspace(ws);
      localStorage.setItem(LAST_WORKSPACE_KEY, id);
    } else {
      // Listesi henüz yüklenmedi — talep edilen ID'yi sakla
      setPendingId(id);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (dto: CreateWorkspaceDto): Promise<Workspace> => {
    const ws = await api.createWorkspace(dto);
    setWorkspaces(prev => [...prev, ws]);
    setCurrentWorkspace(ws);
    localStorage.setItem(LAST_WORKSPACE_KEY, ws.id);
    return ws;
  }, []);

  const updateWorkspace = useCallback(async (id: string, dto: UpdateWorkspaceDto): Promise<Workspace> => {
    const updated = await api.updateWorkspace(id, dto);
    setWorkspaces(prev => prev.map(w => w.id === id ? updated : w));
    if (currentWorkspace?.id === id) setCurrentWorkspace(updated);
    return updated;
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (id: string): Promise<void> => {
    await api.deleteWorkspace(id);
    const remaining = workspaces.filter(w => w.id !== id);
    setWorkspaces(remaining);
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(remaining[0] ?? null);
    }
  }, [workspaces, currentWorkspace]);

  const addMember = useCallback(async (userId: string, role?: WorkspaceRole): Promise<WorkspaceMember> => {
    if (!currentWorkspace) throw new Error('Aktif workspace yok');
    const member = await api.addWorkspaceMember(currentWorkspace.id, userId, role);
    await fetchWorkspaces();
    return member;
  }, [currentWorkspace, fetchWorkspaces]);

  const updateMemberRole = useCallback(async (userId: string, role: WorkspaceRole): Promise<WorkspaceMember> => {
    if (!currentWorkspace) throw new Error('Aktif workspace yok');
    const member = await api.updateWorkspaceMemberRole(currentWorkspace.id, userId, role);
    await fetchWorkspaces();
    return member;
  }, [currentWorkspace, fetchWorkspaces]);

  const updateMemberPermissions = useCallback(async (userId: string, perms: Partial<UserPermissions>): Promise<WorkspaceMember> => {
    if (!currentWorkspace) throw new Error('Aktif workspace yok');
    const member = await api.updateWorkspaceMemberPermissions(currentWorkspace.id, userId, perms);
    await fetchWorkspaces();
    return member;
  }, [currentWorkspace, fetchWorkspaces]);

  const removeMember = useCallback(async (userId: string): Promise<void> => {
    if (!currentWorkspace) throw new Error('Aktif workspace yok');
    await api.removeWorkspaceMember(currentWorkspace.id, userId);
    await fetchWorkspaces();
  }, [currentWorkspace, fetchWorkspaces]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      isLoading,
      setCurrentWorkspaceById,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      addMember,
      updateMemberRole,
      updateMemberPermissions,
      removeMember,
      refetch: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
