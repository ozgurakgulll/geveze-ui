// ─────────────────────────────────────────────────────────────────────────────
// Temel Union Tipler
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'brief'
  | 'in-progress'
  | 'review'
  | 'revision'
  | 'done';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ViewType =
  | 'table'
  | 'portfolio'
  | 'board'
  | 'timeline'
  | 'dashboard'
  | 'calendar'
  | 'person'
  | 'analytics'
  | 'archive'
  | 'trash'
  | 'users';

export type PortfolioStatus = 'active' | 'on-hold' | 'left';

export type PortfolioRole = 'admin' | 'manager' | 'editor' | 'viewer';

export type CustomColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'link'
  | 'priority'
  | 'status';

/** Hizmet tipi — serbest string */
export type ServiceType = string;

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı Arayüzler
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityLogItem {
  id: string;
  date: string;
  author: string;
  action: string;
  note: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  createdAt: string; // ISO
}

export interface SocialMediaAccount {
  platform: string;
  handle: string;
  url: string;
  visibleTo: PortfolioRole[];
}

export interface BrandIdentity {
  logos: string[];
  logoAttachments?: TaskAttachment[];
  colorPalette: string[];
  fonts: string[];
  brandTone: string;
}

export interface CompanyContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface MonthlyContentQuota {
  video: number;
  post: number;
  story: number;
  render3d?: number;
}

export interface ContentCalendarItem {
  id: string;
  date: string;
  title: string;
  channel: string;
  status: 'planned' | 'in-production' | 'published';
}

export interface TableColumnSchemaItem {
  id: string;
  label: string;
  width?: string;
  type?: CustomColumnType | 'base';
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Varlık Arayüzleri
// ─────────────────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'manager' | 'member';

export interface UserPermissions {
  canViewAnalytics: boolean;
  canViewArchive: boolean;
  canViewTrash: boolean;
  canManagePortfolio: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canEditOthersTasks: boolean;
}

export const DEFAULT_MEMBER_PERMISSIONS: UserPermissions = {
  canViewAnalytics: false,
  canViewArchive: true,
  canViewTrash: true,
  canManagePortfolio: false,
  canCreateTasks: true,
  canDeleteTasks: false,
  canEditOthersTasks: false,
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  color: string;
  title?: string;
  role: AppRole;
  permissions?: UserPermissions;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: User;
  assigneeId?: string;
  assigneeName?: string;
  portfolioCompanyId?: string;
  portfolioCompanyName?: string;
  dueDate?: Date;
  tags: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  customFields?: Record<string, string>;
  activityLog?: ActivityLogItem[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  archived?: boolean;
  deletedAt?: string | null;
}

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  members: User[];
  columns: Column[];
  createdAt: Date;
}

export interface TimelineItem {
  id: string;
  taskId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  assignee?: User;
  status: TaskStatus;
  color: string;
}

export interface PortfolioCompany {
  id: string;
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: string[];
  monthlyQuotas: MonthlyContentQuota;
  socialMediaAccounts: SocialMediaAccount[];
  brandIdentity: BrandIdentity;
  contacts: CompanyContact[];
  assignedTeamMemberIds: string[];
  monthlyContentCalendar: ContentCalendarItem[];
  notes: string[];
  activityLog: ActivityLogItem[];
}

export interface PortfolioCompanyDraft {
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: string[];
  monthlyQuotas: MonthlyContentQuota;
  notes: string[];
  socialMediaAccounts?: SocialMediaAccount[];
  brandIdentity?: BrandIdentity;
  contacts?: CompanyContact[];
  assignedTeamMemberIds?: string[];
  monthlyContentCalendar?: ContentCalendarItem[];
}

export interface PortfolioCategoryGroup {
  letter: string;
  companies: PortfolioCompany[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API DTO Tipleri  (backend ↔ frontend arası veri sözleşmesi)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTaskDto {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  assigneeName?: string;
  portfolioCompanyId?: string;
  portfolioCompanyName?: string;
  dueDate?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  assigneeName?: string;
  portfolioCompanyId?: string;
  portfolioCompanyName?: string;
  dueDate?: string;
  tags?: string[];
  progress?: number;
  archived?: boolean;
  customFields?: Record<string, string>;
  activityLog?: ActivityLogItem[];
  attachments?: TaskAttachment[];
}

export interface CreatePortfolioCompanyDto extends PortfolioCompanyDraft {}
export interface UpdatePortfolioCompanyDto extends Partial<PortfolioCompanyDraft> {}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials'>;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Genel Yanıt Tipleri
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
