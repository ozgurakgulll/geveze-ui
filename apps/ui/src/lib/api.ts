import type {
  Task,
  User,
  PortfolioCompany,
  TaskStatus,
  Priority,
  ActivityLogItem,
  TaskAttachment,
} from '@/types';
import { getStoredToken } from '@/contexts/AuthContext';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api';

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
    assignee,
    assigneeId: typeof raw['assigneeId'] === 'string' ? raw['assigneeId'] : undefined,
    assigneeName: typeof raw['assigneeName'] === 'string' ? raw['assigneeName'] : undefined,
    portfolioCompanyId: typeof raw['portfolioCompanyId'] === 'string' ? raw['portfolioCompanyId'] : undefined,
    portfolioCompanyName: typeof raw['portfolioCompanyName'] === 'string' ? raw['portfolioCompanyName'] : undefined,
    dueDate: typeof raw['dueDate'] === 'string' ? new Date(raw['dueDate']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : [],
    progress: typeof raw['progress'] === 'number' ? raw['progress'] : 0,
    createdAt: typeof raw['createdAt'] === 'string' ? new Date(raw['createdAt']) : new Date(),
    updatedAt: typeof raw['updatedAt'] === 'string' ? new Date(raw['updatedAt']) : new Date(),
    customFields: raw['customFields'] as Record<string, string> | undefined,
    activityLog: raw['activityLog'] as ActivityLogItem[] | undefined,
    attachments: raw['attachments'] as TaskAttachment[] | undefined,
    archived: raw['archived'] as boolean | undefined,
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
  params?: { archived?: boolean; assigneeId?: string; status?: string },
): Promise<Task[]> {
  const q = new URLSearchParams();
  if (params?.archived !== undefined) q.set('archived', String(params.archived));
  if (params?.assigneeId) q.set('assigneeId', params.assigneeId);
  if (params?.status) q.set('status', params.status);
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

export async function getDeletedTasks(userList: User[]): Promise<Task[]> {
  const raw = await request<Record<string, unknown>[]>('/tasks/deleted');
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

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const getPortfolio = (): Promise<PortfolioCompany[]> =>
  request<PortfolioCompany[]>('/portfolio');

export const createPortfolioCompany = (data: unknown): Promise<PortfolioCompany> =>
  request<PortfolioCompany>('/portfolio', { method: 'POST', body: JSON.stringify(data) });

export const updatePortfolioCompany = (id: string, data: unknown): Promise<PortfolioCompany> =>
  request<PortfolioCompany>(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePortfolioCompany = (id: string): Promise<void> =>
  request<void>(`/portfolio/${id}`, { method: 'DELETE' });

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const getTags = (): Promise<{ id: string; name: string; color: string }[]> =>
  request<{ id: string; name: string; color: string }[]>('/tags');

export const createTag = (name: string, color: string): Promise<{ id: string; name: string; color: string }> =>
  request<{ id: string; name: string; color: string }>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });

export const deleteTag = (id: string): Promise<void> =>
  request<void>(`/tags/${id}`, { method: 'DELETE' });

// ─── Service Types ────────────────────────────────────────────────────────────

export const getServiceTypes = (): Promise<{ id: string; name: string }[]> =>
  request<{ id: string; name: string }[]>('/service-types');

export const createServiceType = (name: string): Promise<{ id: string; name: string }> =>
  request<{ id: string; name: string }>('/service-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const deleteServiceType = (id: string): Promise<void> =>
  request<void>(`/service-types/${id}`, { method: 'DELETE' });
