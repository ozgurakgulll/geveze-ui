export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: User;
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
  /** true ise ana listelerde (tablo/tahta vb.) gizlenir */
  archived?: boolean;
}

export type CustomColumnType = 'text' | 'number' | 'date' | 'link' | 'priority' | 'status';

export interface TableColumnSchemaItem {
  id: string;
  label: string;
  width?: string;
  type?: CustomColumnType | 'base';
}

export type TaskStatus =
  | 'brief'
  | 'in-progress'
  | 'review'
  | 'revision'
  | 'done';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  color: string;
  title?: string;
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

export type ViewType =
  | 'table'
  | 'portfolio'
  | 'board'
  | 'timeline'
  | 'dashboard'
  | 'calendar'
  | 'person'
  | 'analytics'
  | 'archive';

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

export type PortfolioStatus = 'active' | 'on-hold' | 'left';
export type PortfolioRole = 'admin' | 'manager' | 'editor' | 'viewer';

export type ServiceType = string;

export interface SocialMediaAccount {
  platform: string;
  handle: string;
  url: string;
  visibleTo: PortfolioRole[];
}

export interface BrandIdentity {
  logos: string[];
  /** Yüklenmiş logo/belge dosyaları (base64) */
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

export interface PortfolioCompany {
  id: string;
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate?: string;
  servicesTaken: ServiceType[];
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
  servicesTaken: ServiceType[];
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
