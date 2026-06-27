import type {
  Task,
  TaskComment,
  User,
  PortfolioCompany,
  CompanyContact,
  SocialMediaAccount,
  BrandIdentity,
  ContentCalendarItem,
  TaskStatus,
  Priority,
  ActivityLogItem,
  TaskAttachment,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  UserPermissions,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from '@/types';
import { getStoredToken } from '@/contexts/AuthContext';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api';

let onUnauthorized: (() => void) | null = null;

/** App.tsx tarafından çağrılır; 401 alındığında clearAuth() tetiklenir */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options?.headers) {
    const extra = options.headers as Record<string, string>;
    Object.assign(headers, extra);
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      onUnauthorized?.();
    }
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials' | 'role'>;
}

export const login = (email: string, password: string): Promise<LoginResult> =>
  request<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// ─── Task parsing ────────────────────────────────────────────────────────────

export function parseApiTask(raw: Record<string, unknown>, userList: User[]): Task {
  const assignee = typeof raw['assigneeId'] === 'string'
    ? userList.find((u) => u.id === raw['assigneeId'])
    : undefined;

  return {
    id: String(raw['id']),
    title: String(raw['title']),
    description: typeof raw['description'] === 'string' ? raw['description'] : undefined,
    status: raw['status'] as TaskStatus,
    priority: raw['priority'] as Priority,
    workspaceId: typeof raw['workspaceId'] === 'string' ? raw['workspaceId'] : undefined,
    assignee,
    assigneeId: typeof raw['assigneeId'] === 'string' ? raw['assigneeId'] : undefined,
    assigneeName: typeof raw['assigneeName'] === 'string' ? raw['assigneeName'] : undefined,
    portfolioCompanyId: typeof raw['portfolioCompanyId'] === 'string' ? raw['portfolioCompanyId'] : undefined,
    portfolioCompanyName: typeof raw['portfolioCompanyName'] === 'string' ? raw['portfolioCompanyName'] : undefined,
    startDate: raw['startDate'] ? new Date(raw['startDate'] as string) : undefined,
    dueDate: raw['dueDate'] ? new Date(raw['dueDate'] as string) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : [],
    progress: typeof raw['progress'] === 'number' ? raw['progress'] : 0,
    createdAt: raw['createdAt'] ? new Date(raw['createdAt'] as string) : new Date(),
    updatedAt: raw['updatedAt'] ? new Date(raw['updatedAt'] as string) : new Date(),
    customFields: raw['customFields'] as Record<string, string> | undefined,
    activityLog: raw['activityLog'] as ActivityLogItem[] | undefined,
    attachments: raw['attachments'] as TaskAttachment[] | undefined,
    comments: raw['comments'] as import('@geveze/shared').TaskComment[] | undefined,
    archived: raw['archived'] as boolean | undefined,
    deletedAt: typeof raw['deletedAt'] === 'string' ? raw['deletedAt'] : undefined,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUsers = (): Promise<User[]> => request<User[]>('/users');

export const createUser = (data: {
  email: string; name: string; initials: string; color: string;
  title?: string; role?: string; password: string;
}): Promise<User> =>
  request<User>('/users', { method: 'POST', body: JSON.stringify(data) });

export const updateUser = (id: string, data: Partial<User>): Promise<User> =>
  request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteUser = (id: string): Promise<void> =>
  request<void>(`/users/${id}`, { method: 'DELETE' });

export const updateUserPermissions = (
  id: string,
  permissions: import('@/types').UserPermissions,
): Promise<User> =>
  request<User>(`/users/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });

export const resetUserPassword = (id: string, newPassword: string): Promise<void> =>
  request<void>(`/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  });

export const updateUserRole = (id: string, role: string): Promise<User> =>
  request<User>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks(
  userList: User[],
  params?: {
    workspaceId?: string;
    archived?: boolean;
    assigneeId?: string;
    status?: string;
    portfolioCompanyId?: string;
    priority?: string;
    tags?: string[];
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
  },
): Promise<Task[]> {
  const q = new URLSearchParams();
  if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
  if (params?.archived !== undefined) q.set('archived', String(params.archived));
  if (params?.assigneeId) q.set('assigneeId', params.assigneeId);
  if (params?.status) q.set('status', params.status);
  if (params?.portfolioCompanyId) q.set('portfolioCompanyId', params.portfolioCompanyId);
  if (params?.priority) q.set('priority', params.priority);
  if (params?.tags?.length) q.set('tags', params.tags.join(','));
  if (params?.dueDateFrom) q.set('dueDateFrom', params.dueDateFrom);
  if (params?.dueDateTo) q.set('dueDateTo', params.dueDateTo);
  if (params?.search) q.set('search', params.search);
  const qs = q.toString();
  const raw = await request<Record<string, unknown>[]>(`/tasks${qs ? `?${qs}` : ''}`);
  return raw.map((t) => parseApiTask(t, userList));
}

export async function createTask(
  data: {
    title: string;
    description?: string;
    status: string;
    priority: string;
    workspaceId?: string;
    assigneeId?: string;
    assigneeName?: string;
    portfolioCompanyId?: string;
    portfolioCompanyName?: string;
    dueDate?: string;
    tags?: string[];
    customFields?: Record<string, string>;
  },
  userList: User[],
): Promise<Task> {
  const raw = await request<Record<string, unknown>>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return parseApiTask(raw, userList);
}

export async function updateTask(
  id: string,
  data: Record<string, unknown>,
  userList: User[],
): Promise<Task> {
  const raw = await request<Record<string, unknown>>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return parseApiTask(raw, userList);
}

export const deleteTask = (id: string): Promise<void> =>
  request<void>(`/tasks/${id}`, { method: 'DELETE' });

export async function getDeletedTasks(userList: User[], workspaceId?: string): Promise<Task[]> {
  const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
  const raw = await request<Record<string, unknown>[]>(`/tasks/deleted${qs}`);
  return raw.map((t) => parseApiTask(t, userList));
}

export async function restoreDeletedTask(id: string, userList: User[]): Promise<Task> {
  const raw = await request<Record<string, unknown>>(`/tasks/${id}/restore`, { method: 'PATCH' });
  return parseApiTask(raw, userList);
}

export const permanentDeleteTask = (id: string): Promise<void> =>
  request<void>(`/tasks/${id}/permanent`, { method: 'DELETE' });

export async function setTaskArchived(id: string, archived: boolean, userList: User[]): Promise<Task> {
  const raw = await request<Record<string, unknown>>(`/tasks/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  });
  return parseApiTask(raw, userList);
}

export async function addAttachment(
  taskId: string,
  attachment: TaskAttachment,
  userList: User[],
): Promise<Task> {
  const raw = await request<Record<string, unknown>>(`/tasks/${taskId}/attachments`, {
    method: 'POST',
    body: JSON.stringify(attachment),
  });
  return parseApiTask(raw, userList);
}

export async function removeAttachment(
  taskId: string,
  attachmentId: string,
  userList: User[],
): Promise<Task> {
  const raw = await request<Record<string, unknown>>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
  );
  return parseApiTask(raw, userList);
}

export const bulkDeleteTasks = (ids: string[]): Promise<void> =>
  request<void>('/tasks/bulk/delete', { method: 'PATCH', body: JSON.stringify({ ids }) });

export const bulkReassignTasks = (
  ids: string[],
  assigneeId: string,
  assigneeName?: string,
): Promise<void> =>
  request<void>('/tasks/bulk/reassign', {
    method: 'PATCH',
    body: JSON.stringify({ ids, assigneeId, assigneeName }),
  });

export const bulkArchiveTasks = (ids: string[]): Promise<void> =>
  request<void>('/tasks/bulk/archive', { method: 'PATCH', body: JSON.stringify({ ids }) });

// ─── Task Comments ────────────────────────────────────────────────────────────

export const addTaskComment = (
  taskId: string,
  payload: Omit<TaskComment, 'id' | 'createdAt'>,
): Promise<Task> =>
  request<Task>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteTaskComment = (taskId: string, commentId: string): Promise<Task> =>
  request<Task>(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = (workspaceId?: string): Promise<Record<string, unknown>> => {
  const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
  return request<Record<string, unknown>>(`/settings${qs}`);
};

export const updateSetting = (key: string, value: unknown): Promise<void> =>
  request<void>(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });

export const updateSettings = (settings: Record<string, unknown>): Promise<void> =>
  request<void>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

// ─── Portfolio ────────────────────────────────────────────────────────────────

// Portföy global — workspace filtresi yok
export const getPortfolio = (): Promise<PortfolioCompany[]> =>
  request<PortfolioCompany[]>('/portfolio');

export const createPortfolioCompany = (data: unknown): Promise<PortfolioCompany> =>
  request<PortfolioCompany>('/portfolio', { method: 'POST', body: JSON.stringify(data) });

export const updatePortfolioCompany = (id: string, data: unknown): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePortfolioCompany = (id: string): Promise<void> =>
  request<void>(`/portfolio/${id}`, { method: 'DELETE' });

export const permanentDeletePortfolioCompany = (id: string): Promise<void> =>
  request<void>(`/portfolio/${id}/permanent`, { method: 'DELETE' });

export const restorePortfolioCompany = (id: string): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/restore`, { method: 'PATCH' });

export const getDeletedPortfolioCompanies = (): Promise<PortfolioCompany[]> =>
  request<PortfolioCompany[]>('/portfolio/deleted');

export const updatePortfolioContacts = (id: string, contacts: CompanyContact[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/contacts`, {
    method: 'PATCH',
    body: JSON.stringify({ contacts }),
  });

export const updatePortfolioSocialMedia = (id: string, accounts: SocialMediaAccount[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/social-media`, {
    method: 'PATCH',
    body: JSON.stringify({ accounts }),
  });

export const updatePortfolioBrand = (id: string, brandIdentity: BrandIdentity): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/brand`, {
    method: 'PATCH',
    body: JSON.stringify({ brandIdentity }),
  });

export const updatePortfolioCalendar = (id: string, calendar: ContentCalendarItem[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/calendar`, {
    method: 'PATCH',
    body: JSON.stringify({ calendar }),
  });

export const updatePortfolioNotes = (id: string, notes: string[]): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const getTags = (workspaceId?: string): Promise<{ id: string; name: string; color: string }[]> => {
  const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
  return request<{ id: string; name: string; color: string }[]>(`/tags${qs}`);
};

export const createTag = (name: string, color: string): Promise<{ id: string; name: string; color: string }> =>
  request<{ id: string; name: string; color: string }>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });

export const updateTag = (
  id: string,
  updates: { name?: string; color?: string },
): Promise<{ id: string; name: string; color: string }> =>
  request<{ id: string; name: string; color: string }>(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const deleteTag = (id: string): Promise<void> =>
  request<void>(`/tags/${id}`, { method: 'DELETE' });

// ─── Service Types ────────────────────────────────────────────────────────────

export const getServiceTypes = (workspaceId?: string): Promise<{ id: string; name: string }[]> => {
  const qs = workspaceId ? `?workspaceId=${workspaceId}` : '';
  return request<{ id: string; name: string }[]>(`/service-types${qs}`);
};

export const createServiceType = (name: string): Promise<{ id: string; name: string }> =>
  request<{ id: string; name: string }>('/service-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const updateServiceType = (id: string, name: string): Promise<{ id: string; name: string }> =>
  request<{ id: string; name: string }>(`/service-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const deleteServiceType = (id: string): Promise<void> =>
  request<void>(`/service-types/${id}`, { method: 'DELETE' });

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const getWorkspaces = (): Promise<Workspace[]> =>
  request<Workspace[]>('/workspaces');

export const createWorkspace = (dto: CreateWorkspaceDto): Promise<Workspace> =>
  request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(dto) });

export const getWorkspace = (id: string): Promise<Workspace> =>
  request<Workspace>(`/workspaces/${id}`);

export const updateWorkspace = (id: string, dto: UpdateWorkspaceDto): Promise<Workspace> =>
  request<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const deleteWorkspace = (id: string): Promise<void> =>
  request<void>(`/workspaces/${id}`, { method: 'DELETE' });

export const addWorkspaceMember = (
  workspaceId: string,
  userId: string,
  role?: WorkspaceRole,
): Promise<WorkspaceMember> =>
  request<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId, role }),
  });

export const updateWorkspaceMemberRole = (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMember> =>
  request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const updateWorkspaceMemberPermissions = (
  workspaceId: string,
  userId: string,
  permissions: Partial<UserPermissions>,
): Promise<WorkspaceMember> =>
  request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });

export const removeWorkspaceMember = (workspaceId: string, userId: string): Promise<void> =>
  request<void>(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });

// ─── Time Entries ─────────────────────────────────────────────────────────────

import type { TimeEntry, TimeEntryStats } from '@geveze/shared';

export const getActiveTimer = (): Promise<TimeEntry | null> =>
  request<TimeEntry | null>('/time-entries/active');

export const startTimer = (
  taskId: string,
  taskTitle: string,
  workspaceId?: string,
  portfolioCompanyId?: string,
): Promise<TimeEntry> =>
  request<TimeEntry>('/time-entries/start', {
    method: 'POST',
    body: JSON.stringify({ taskId, taskTitle, workspaceId, portfolioCompanyId }),
  });

export const stopTimer = (note?: string): Promise<TimeEntry> =>
  request<TimeEntry>('/time-entries/stop', {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const createManualTimeEntry = (data: {
  taskId: string;
  taskTitle: string;
  minutes: number;
  date: string;
  note?: string;
  workspaceId?: string;
  portfolioCompanyId?: string;
}): Promise<TimeEntry> =>
  request<TimeEntry>('/time-entries/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getTaskTimeEntries = (taskId: string): Promise<TimeEntry[]> =>
  request<TimeEntry[]>(`/time-entries/task/${taskId}`);

export const getUserTimeEntries = (
  userId: string,
  params?: { from?: string; to?: string; workspaceId?: string },
): Promise<TimeEntry[]> => {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
  const qs = q.toString();
  return request<TimeEntry[]>(`/time-entries/user/${userId}${qs ? `?${qs}` : ''}`);
};

export const getTimeStats = (params?: {
  workspaceId?: string;
  userId?: string;
  portfolioCompanyId?: string;
  from?: string;
  to?: string;
}): Promise<TimeEntryStats> => {
  const q = new URLSearchParams();
  if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
  if (params?.userId) q.set('userId', params.userId);
  if (params?.portfolioCompanyId) q.set('portfolioCompanyId', params.portfolioCompanyId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return request<TimeEntryStats>(`/time-entries/stats${qs ? `?${qs}` : ''}`);
};

export const deleteTimeEntry = (id: string): Promise<void> =>
  request<void>(`/time-entries/${id}`, { method: 'DELETE' });
