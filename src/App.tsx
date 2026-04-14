import { useState, useCallback, useEffect, useMemo } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { AppViewRouter } from '@/components/app/AppViewRouter';
import type {
  ActivityLogItem,
  CustomColumnType,
  MonthlyContentQuota,
  PortfolioCompany,
  PortfolioCompanyDraft,
  PortfolioRole,
  PortfolioStatus,
  Priority,
  ServiceType,
  TableColumnSchemaItem,
  Task,
  TaskAttachment,
  TaskStatus,
  ViewType,
} from '@/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { initialTasks, priorityLabels, statusLabels, users } from '@/data/mockData';
import { portfolioCompanies as portfolioSeedCompanies } from '@/data/portfolioData';
import { getTaskProgress } from '@/lib/taskProgress';
import { isTaskOverdue } from '@/lib/taskOverdue';
import {
  OLD_CUSTOM_COLUMNS_KEY,
  OLD_CUSTOM_VALUES_KEY,
  PORTFOLIO_STORAGE_KEY,
  SERVICE_TYPES_STORAGE_KEY,
  TABLE_SCHEMA_STORAGE_KEY,
  TAG_SERVICE_MAP_KEY,
  TAGS_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  VIEW_STORAGE_KEY,
} from '@/lib/gevezeStorageKeys';
import { clearGevezePersistedKeys } from '@/hooks/useGevezeStorage';

const DEFAULT_SERVICE_TYPES: string[] = [
  'Video Prodüksiyon',
  'Sosyal Medya Yönetimi',
  'Performance Marketing',
  'Grafik Tasarım',
  'İçerik Yazarlığı',
  'Web Geliştirme',
  'SEO',
  'Influencer Marketing',
  'Kurumsal Kimlik',
  'İç Projeler',
];

const loadServiceTypes = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_SERVICE_TYPES;
  try {
    const raw = window.localStorage.getItem(SERVICE_TYPES_STORAGE_KEY);
    if (!raw) return DEFAULT_SERVICE_TYPES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SERVICE_TYPES;
    const valid = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    return valid.length > 0 ? valid : DEFAULT_SERVICE_TYPES;
  } catch {
    return DEFAULT_SERVICE_TYPES;
  }
};

const DEFAULT_TAGS = [
  'Web Site',
  'Sosyal Medya',
  'Tasarım',
  'Post',
  'Story',
  'Reels',
  'Katalog',
  'Tanıtım Filmi',
  '3D',
  'Motion Graphic',
];

const loadTags = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_TAGS;
  try {
    const raw = window.localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return DEFAULT_TAGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TAGS;
    const valid = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    return valid.length > 0 ? valid : DEFAULT_TAGS;
  } catch {
    return DEFAULT_TAGS;
  }
};

const DEFAULT_TAG_SERVICE_MAP: Record<string, string> = {
  Post: 'Sosyal Medya Yönetimi',
  Story: 'Sosyal Medya Yönetimi',
  Reels: 'Sosyal Medya Yönetimi',
  'Tanıtım Filmi': 'Video Prodüksiyon',
  '3D': 'Video Prodüksiyon',
  'Motion Graphic': 'Video Prodüksiyon',
  'Web Site': 'Web Geliştirme',
};

const loadTagServiceMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return { ...DEFAULT_TAG_SERVICE_MAP };
  try {
    const raw = window.localStorage.getItem(TAG_SERVICE_MAP_KEY);
    if (!raw) return { ...DEFAULT_TAG_SERVICE_MAP };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_TAG_SERVICE_MAP };
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
        result[k] = v;
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_TAG_SERVICE_MAP };
  }
};

/** Seçim + ⋮ menü sığsın; dar sütun grid taşmasıyla başlığın üstüne biner */
const MIN_TABLE_SELECT_COL_PX = 72;

/** Eski kayıtlardan / localStorage'dan gelen "Yorum" sütununu kaldırır */
function withoutCommentsColumn(schema: TableColumnSchemaItem[]): TableColumnSchemaItem[] {
  return schema.filter((c) => c.id !== 'comments');
}

function normalizeTableSchema(schema: TableColumnSchemaItem[]): TableColumnSchemaItem[] {
  return withMinimumSelectColumnWidth(withoutCommentsColumn(schema));
}

function withMinimumSelectColumnWidth(schema: TableColumnSchemaItem[]): TableColumnSchemaItem[] {
  return schema.map((col) => {
    if (col.id !== 'select') return col;
    const w = String(col.width ?? '').trim();
    const m = /^(\d+)px$/i.exec(w);
    const n = m ? parseInt(m[1], 10) : 0;
    if (!Number.isFinite(n) || n < MIN_TABLE_SELECT_COL_PX) {
      return { ...col, width: `${MIN_TABLE_SELECT_COL_PX}px` };
    }
    /* Eski 72–108px varsayılanları tek sıkı genişliğe çek (checkbox–başlık boşluğu) */
    if (n <= 108) {
      return { ...col, width: `${MIN_TABLE_SELECT_COL_PX}px` };
    }
    return col;
  });
}

const DEFAULT_TABLE_COLUMN_SCHEMA: TableColumnSchemaItem[] = [
  { id: 'select', label: '', width: `${MIN_TABLE_SELECT_COL_PX}px`, type: 'base' },
  { id: 'item', label: 'Öğe', width: '260px', type: 'base' },
  { id: 'assignee', label: 'Tasarımcı', width: '120px', type: 'base' },
  { id: 'priority', label: 'Öncelik', width: '110px', type: 'base' },
  { id: 'status', label: 'Durum', width: '130px', type: 'base' },
  { id: 'timeline', label: 'Zaman Çizelgesi', width: '140px', type: 'base' },
  { id: 'due', label: 'Son Teslim', width: '130px', type: 'base' },
  { id: 'brief', label: 'Brief Açıklaması', width: '260px', type: 'base' },
  { id: 'link', label: 'Bağlantı', width: '120px', type: 'base' },
  { id: 'doc', label: 'Belge', width: '80px', type: 'base' },
  { id: 'export', label: 'Dışa Aktar', width: '110px', type: 'base' },
];

const loadTableColumnSchema = (): TableColumnSchemaItem[] => {
  if (typeof window === 'undefined') return normalizeTableSchema(DEFAULT_TABLE_COLUMN_SCHEMA);
  try {
    const raw = window.localStorage.getItem(TABLE_SCHEMA_STORAGE_KEY);
    if (!raw) {
      const oldCols = window.localStorage.getItem(OLD_CUSTOM_COLUMNS_KEY);
      if (oldCols) {
        try {
          const parsed = JSON.parse(oldCols);
          if (Array.isArray(parsed)) {
            const customItems: TableColumnSchemaItem[] = parsed
              .filter((col: unknown) => col && typeof col === 'object')
              .map((col: Record<string, unknown>) => ({
                id: String(col.id ?? ''),
                label: String(col.name ?? ''),
                width: '160px',
                type: (['text', 'number', 'date', 'link', 'priority', 'status'] as CustomColumnType[]).includes(
                  col.type as CustomColumnType
                )
                  ? (col.type as CustomColumnType)
                  : ('text' as CustomColumnType),
              }))
              .filter((c: TableColumnSchemaItem) => c.id);
            const base = DEFAULT_TABLE_COLUMN_SCHEMA.filter((c) => c.id !== 'export');
            return normalizeTableSchema([
              ...base,
              ...customItems,
              { id: 'export', label: 'Dışa Aktar', width: '110px', type: 'base' as const },
            ]);
          }
        } catch {
          /* ignore */
        }
      }
      return normalizeTableSchema(DEFAULT_TABLE_COLUMN_SCHEMA);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0)
      return normalizeTableSchema(DEFAULT_TABLE_COLUMN_SCHEMA);
    const valid = parsed.filter(
      (c: unknown): c is TableColumnSchemaItem =>
        c != null &&
        typeof c === 'object' &&
        typeof (c as TableColumnSchemaItem).id === 'string' &&
        typeof (c as TableColumnSchemaItem).label === 'string'
    );
    return normalizeTableSchema(valid.length > 0 ? valid : DEFAULT_TABLE_COLUMN_SCHEMA);
  } catch {
    return normalizeTableSchema(DEFAULT_TABLE_COLUMN_SCHEMA);
  }
};

const portfolioStatuses: PortfolioStatus[] = ['active', 'on-hold', 'left'];
const portfolioPrivateRoles: PortfolioRole[] = ['admin', 'manager'];
const isPortfolioStatus = (value: unknown): value is PortfolioStatus =>
  typeof value === 'string' && portfolioStatuses.includes(value as PortfolioStatus);

const isServiceType = (value: unknown): value is ServiceType =>
  typeof value === 'string' && value.trim().length > 0;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';

const createActivityLog = (
  companyId: string,
  action: string,
  note: string,
  author = 'System'
): ActivityLogItem => ({
  id: `${companyId}-${action.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
  date: new Date().toISOString(),
  author,
  action,
  note,
});

const createTaskActivityLog = (
  taskId: string,
  action: string,
  note: string,
  author = 'System'
): ActivityLogItem => ({
  id: `task-${taskId}-${action.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  date: new Date().toISOString(),
  author,
  action,
  note,
});

const normalizeMonthlyQuotas = (raw: unknown): MonthlyContentQuota => {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const video = typeof data.video === 'number' && data.video >= 0 ? data.video : 0;
  const post = typeof data.post === 'number' && data.post >= 0 ? data.post : 0;
  const story = typeof data.story === 'number' && data.story >= 0 ? data.story : 0;
  const render3d = typeof data.render3d === 'number' && data.render3d >= 0 ? data.render3d : 0;

  return { video, post, story, render3d };
};

const normalizePortfolioCompany = (raw: unknown): PortfolioCompany | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  if (typeof data.id !== 'string' || typeof data.name !== 'string') return null;
  if (!isPortfolioStatus(data.status) || typeof data.startDate !== 'string') return null;

  const servicesTaken = Array.isArray(data.servicesTaken)
    ? data.servicesTaken.filter(isServiceType)
    : [];

  const monthlyQuotas = normalizeMonthlyQuotas(data.monthlyQuotas);

  const socialMediaAccounts = Array.isArray(data.socialMediaAccounts)
    ? data.socialMediaAccounts
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const account = item as Record<string, unknown>;
          if (
            typeof account.platform !== 'string' ||
            typeof account.handle !== 'string' ||
            typeof account.url !== 'string'
          ) {
            return null;
          }

          const visibleTo = Array.isArray(account.visibleTo)
            ? account.visibleTo.filter(
                (role): role is PortfolioRole =>
                  role === 'admin' || role === 'manager' || role === 'editor' || role === 'viewer'
              )
            : portfolioPrivateRoles;

          return {
            platform: account.platform,
            handle: account.handle,
            url: account.url,
            visibleTo,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  const brandIdentityRaw =
    data.brandIdentity && typeof data.brandIdentity === 'object'
      ? (data.brandIdentity as Record<string, unknown>)
      : {};

  const logoAttachments = Array.isArray(brandIdentityRaw.logoAttachments)
    ? brandIdentityRaw.logoAttachments
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') return null;
          const att = item as Record<string, unknown>;
          if (
            typeof att.id !== 'string' ||
            typeof att.name !== 'string' ||
            typeof att.type !== 'string' ||
            typeof att.data !== 'string'
          ) {
            return null;
          }
          return {
            id: att.id,
            name: att.name,
            type: att.type,
            size: typeof att.size === 'number' ? att.size : 0,
            data: att.data,
            uploadedAt: typeof att.uploadedAt === 'string' ? att.uploadedAt : new Date().toISOString(),
          };
        })
        .filter((item): item is import('@/types').TaskAttachment => item !== null)
    : [];

  const brandIdentity = {
    logos: Array.isArray(brandIdentityRaw.logos)
      ? brandIdentityRaw.logos.filter((item): item is string => typeof item === 'string')
      : [],
    logoAttachments: logoAttachments.length > 0 ? logoAttachments : undefined,
    colorPalette: Array.isArray(brandIdentityRaw.colorPalette)
      ? brandIdentityRaw.colorPalette.filter((item): item is string => typeof item === 'string')
      : ['#111827', '#E5E7EB'],
    fonts: Array.isArray(brandIdentityRaw.fonts)
      ? brandIdentityRaw.fonts.filter((item): item is string => typeof item === 'string')
      : ['Inter'],
    brandTone: typeof brandIdentityRaw.brandTone === 'string' ? brandIdentityRaw.brandTone : 'Corporate',
  };

  const contacts = Array.isArray(data.contacts)
    ? data.contacts
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const contact = item as Record<string, unknown>;
          if (
            typeof contact.name !== 'string' ||
            typeof contact.role !== 'string' ||
            typeof contact.email !== 'string' ||
            typeof contact.phone !== 'string'
          ) {
            return null;
          }

          return {
            name: contact.name,
            role: contact.role,
            email: contact.email,
            phone: contact.phone,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  const assignedTeamMemberIds = Array.isArray(data.assignedTeamMemberIds)
    ? data.assignedTeamMemberIds.filter((item): item is string => typeof item === 'string')
    : [];

  const monthlyContentCalendar = Array.isArray(data.monthlyContentCalendar)
    ? data.monthlyContentCalendar
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const calendar = item as Record<string, unknown>;
          const status = calendar.status;
          if (
            typeof calendar.id !== 'string' ||
            typeof calendar.date !== 'string' ||
            typeof calendar.title !== 'string' ||
            typeof calendar.channel !== 'string' ||
            (status !== 'planned' && status !== 'in-production' && status !== 'published')
          ) {
            return null;
          }

          return {
            id: calendar.id,
            date: calendar.date,
            title: calendar.title,
            channel: calendar.channel,
            status: status as 'planned' | 'in-production' | 'published',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  const notes = Array.isArray(data.notes)
    ? data.notes.filter((item): item is string => typeof item === 'string')
    : [];

  const activityLog = Array.isArray(data.activityLog)
    ? data.activityLog
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const log = item as Record<string, unknown>;
          if (
            typeof log.id !== 'string' ||
            typeof log.date !== 'string' ||
            typeof log.author !== 'string' ||
            typeof log.action !== 'string' ||
            typeof log.note !== 'string'
          ) {
            return null;
          }

          return {
            id: log.id,
            date: log.date,
            author: log.author,
            action: log.action,
            note: log.note,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  return {
    id: data.id,
    name: data.name,
    status: data.status,
    startDate: data.startDate,
    exitDate: typeof data.exitDate === 'string' ? data.exitDate : undefined,
    servicesTaken,
    monthlyQuotas,
    socialMediaAccounts,
    brandIdentity,
    contacts,
    assignedTeamMemberIds,
    monthlyContentCalendar,
    notes,
    activityLog,
  };
};

const loadInitialPortfolioCompanies = (): PortfolioCompany[] => {
  if (typeof window === 'undefined') return portfolioSeedCompanies;

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return portfolioSeedCompanies;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return portfolioSeedCompanies;

    const companies = parsed
      .map(normalizePortfolioCompany)
      .filter((company): company is PortfolioCompany => company !== null);

    if (parsed.length > 0 && companies.length === 0) {
      return portfolioSeedCompanies;
    }

    return companies;
  } catch {
    return portfolioSeedCompanies;
  }
};

const parseTask = (raw: unknown): Task | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' || typeof data.title !== 'string') return null;
  if (
    data.status !== 'brief' &&
    data.status !== 'in-progress' &&
    data.status !== 'review' &&
    data.status !== 'revision' &&
    data.status !== 'done'
  ) {
    return null;
  }
  if (
    data.priority !== 'low' &&
    data.priority !== 'medium' &&
    data.priority !== 'high' &&
    data.priority !== 'urgent'
  ) {
    return null;
  }

  const assigneeId =
    data.assignee && typeof data.assignee === 'object'
      ? (data.assignee as { id?: unknown }).id
      : undefined;
  const assignee =
    typeof assigneeId === 'string' ? users.find((user) => user.id === assigneeId) : undefined;

  const customFields: Record<string, string> = {};
  if (data.customFields && typeof data.customFields === 'object') {
    const cf = data.customFields as Record<string, unknown>;
    for (const k of Object.keys(cf)) {
      if (typeof cf[k] === 'string') customFields[k] = cf[k] as string;
    }
  }

  const activityLog: ActivityLogItem[] = Array.isArray(data.activityLog)
    ? data.activityLog
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') return null;
          const log = item as Record<string, unknown>;
          if (
            typeof log.id !== 'string' ||
            typeof log.date !== 'string' ||
            typeof log.author !== 'string' ||
            typeof log.action !== 'string' ||
            typeof log.note !== 'string'
          ) {
            return null;
          }
          return {
            id: log.id,
            date: log.date,
            author: log.author,
            action: log.action,
            note: log.note,
          };
        })
        .filter((item): item is ActivityLogItem => item !== null)
    : [];

  const attachments: TaskAttachment[] = Array.isArray(data.attachments)
    ? data.attachments
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') return null;
          const att = item as Record<string, unknown>;
          if (
            typeof att.id !== 'string' ||
            typeof att.name !== 'string' ||
            typeof att.type !== 'string' ||
            typeof att.data !== 'string'
          ) {
            return null;
          }
          return {
            id: att.id,
            name: att.name,
            type: att.type,
            size: typeof att.size === 'number' ? att.size : 0,
            data: att.data,
            uploadedAt: typeof att.uploadedAt === 'string' ? att.uploadedAt : new Date().toISOString(),
          };
        })
        .filter((item): item is TaskAttachment => item !== null)
    : [];

  return {
    id: data.id,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : '',
    status: data.status,
    priority: data.priority,
    assignee,
    portfolioCompanyId:
      typeof data.portfolioCompanyId === 'string' ? data.portfolioCompanyId : undefined,
    portfolioCompanyName:
      typeof data.portfolioCompanyName === 'string' ? data.portfolioCompanyName : undefined,
    dueDate: typeof data.dueDate === 'string' ? new Date(data.dueDate) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    progress: typeof data.progress === 'number' ? data.progress : 0,
    createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : new Date(),
    updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : new Date(),
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    activityLog: activityLog.length > 0 ? activityLog : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    archived: data.archived === true ? true : undefined,
  };
};

const loadInitialTasks = (): Task[] => {
  if (typeof window === 'undefined') return initialTasks;
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return initialTasks;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialTasks;
    const tasks = parsed.map(parseTask).filter((task): task is Task => task !== null);
    return tasks.length > 0 ? tasks : initialTasks;
  } catch {
    return initialTasks;
  }
};

const isViewType = (value: unknown): value is ViewType => {
  return (
    value === 'table' ||
    value === 'portfolio' ||
    value === 'board' ||
    value === 'timeline' ||
    value === 'dashboard' ||
    value === 'calendar' ||
    value === 'person' ||
    value === 'analytics' ||
    value === 'archive'
  );
};

const loadInitialView = (): ViewType => {
  if (typeof window === 'undefined') return 'dashboard';
  const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return isViewType(saved) ? saved : 'dashboard';
};

function App() {
  const [currentView, setCurrentView] = useState<ViewType>(loadInitialView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [addTaskDefaultStatus, setAddTaskDefaultStatus] = useState<TaskStatus>('brief');
  const [addTaskDefaultDueDate, setAddTaskDefaultDueDate] = useState<Date | undefined>();
  const [addTaskDefaultAssigneeId, setAddTaskDefaultAssigneeId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(loadInitialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPortfolioCompanyId, setSelectedPortfolioCompanyId] = useState<string | null>(null);
  const [portfolioCompaniesState, setPortfolioCompaniesState] =
    useState<PortfolioCompany[]>(loadInitialPortfolioCompanies);
  const [tableColumnSchema, setTableColumnSchema] = useState<TableColumnSchemaItem[]>(
    loadTableColumnSchema
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [globalAssigneeFilter, setGlobalAssigneeFilter] = useState<string>('');
  const [globalStatusFilter, setGlobalStatusFilter] = useState<string>('');
  const [globalOverdueOnly, setGlobalOverdueOnly] = useState(false);
  const [globalSortBy, setGlobalSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [globalSortDir, setGlobalSortDir] = useState<'asc' | 'desc'>('asc');
  const [serviceTypes, setServiceTypes] = useState<string[]>(loadServiceTypes);
  const [tagList, setTagList] = useState<string[]>(loadTags);
  const [tagServiceMap, setTagServiceMap] = useState<Record<string, string>>(loadTagServiceMap);
  const currentUserRole: PortfolioRole = 'manager';
  const canManagePortfolio = ['admin', 'manager'].includes(currentUserRole);

  const portfolioTaskOptions = useMemo(
    () =>
      portfolioCompaniesState
        .map((company) => ({ id: company.id, name: company.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [portfolioCompaniesState]
  );

  const filteredTasks = useMemo(() => {
    const priorityRank: Record<Priority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    let result = tasks.filter((task) => !task.archived);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          (task.description ?? '').toLowerCase().includes(q) ||
          task.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (globalAssigneeFilter) {
      result = result.filter((task) => task.assignee?.id === globalAssigneeFilter);
    }
    if (globalStatusFilter) {
      result = result.filter((task) => task.status === globalStatusFilter);
    }
    if (globalOverdueOnly) {
      result = result.filter((task) => isTaskOverdue(task));
    }
    const compare = (a: Task, b: Task) => {
      if (globalSortBy === 'title') return a.title.localeCompare(b.title, 'tr');
      if (globalSortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
      const aTime = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    };
    result = [...result].sort(compare);
    return globalSortDir === 'desc' ? result.reverse() : result;
  }, [tasks, searchQuery, globalAssigneeFilter, globalStatusFilter, globalOverdueOnly, globalSortBy, globalSortDir]);

  const archivedTasks = useMemo(() => {
    let result = tasks.filter((task) => task.archived === true);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          (task.description ?? '').toLowerCase().includes(q) ||
          task.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [tasks, searchQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, currentView);
  }, [currentView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolioCompaniesState));
  }, [portfolioCompaniesState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TABLE_SCHEMA_STORAGE_KEY, JSON.stringify(tableColumnSchema));
  }, [tableColumnSchema]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SERVICE_TYPES_STORAGE_KEY, JSON.stringify(serviceTypes));
  }, [serviceTypes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tagList));
  }, [tagList]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TAG_SERVICE_MAP_KEY, JSON.stringify(tagServiceMap));
  }, [tagServiceMap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(OLD_CUSTOM_VALUES_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setTasks((prev) => {
          const next = prev.map((task) => {
            const vals = parsed[task.id];
            if (!vals || typeof vals !== 'object') return task;
            const cf: Record<string, string> = { ...task.customFields };
            for (const k of Object.keys(vals)) {
              if (typeof vals[k] === 'string') cf[k] = vals[k];
            }
            if (Object.keys(cf).length === 0) return task;
            return { ...task, customFields: cf };
          });
          if (next.every((t, i) => t === prev[i])) return prev;
          setTimeout(() => window.localStorage.removeItem(OLD_CUSTOM_VALUES_KEY), 0);
          return next;
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleTaskCustomFieldChange = useCallback((taskId: string, columnId: string, value: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              customFields: {
                ...task.customFields,
                [columnId]: value,
              },
              updatedAt: new Date(),
            }
          : task
      )
    );
  }, []);

  const handleRemoveColumnFromTasks = useCallback((columnId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!task.customFields || !(columnId in task.customFields)) return task;
        const { [columnId]: _, ...rest } = task.customFields;
        return { ...task, customFields: Object.keys(rest).length > 0 ? rest : undefined };
      })
    );
  }, []);

  const handleClearAllData = useCallback(() => {
    if (!window.confirm('Tüm veriler silinecek ve sayfa yenilenecek. Emin misiniz?')) return;
    clearGevezePersistedKeys();
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('geveze.'))
      .forEach((k) => window.localStorage.removeItem(k));
    window.location.reload();
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    if (view === 'portfolio') {
      setSelectedPortfolioCompanyId(null);
    }
    setCurrentView(view);
  }, []);

  const handleAddTask = useCallback((columnId?: string, dueDate?: Date, assigneeId?: string) => {
    if (columnId) {
      setAddTaskDefaultStatus(columnId as TaskStatus);
    } else {
      setAddTaskDefaultStatus('brief');
    }
    setAddTaskDefaultDueDate(dueDate);
    setAddTaskDefaultAssigneeId(assigneeId || '');
    setIsAddTaskDialogOpen(true);
  }, []);

  const handleTaskDatesChange = useCallback((taskId: string, startDate: Date, dueDate: Date) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const entry = createTaskActivityLog(
          taskId,
          'Tarihler güncellendi',
          `${format(startDate, 'd MMM yyyy', { locale: tr })} - ${format(dueDate, 'd MMM yyyy', { locale: tr })} aralığına taşındı.`
        );
        return {
          ...task,
          createdAt: startDate,
          dueDate,
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success('Görev tarihleri güncellendi');
  }, []);

  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setCurrentView('person');
  }, []);

  const handleBackToPortfolioOverview = useCallback(() => {
    setSelectedPortfolioCompanyId(null);
  }, []);

  const handleAddServiceType = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setServiceTypes((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'tr'));
      return next;
    });
    toast.success(`"${trimmed}" hizmeti eklendi`);
  }, []);

  const handleRemoveServiceType = useCallback((name: string) => {
    setServiceTypes((prev) => prev.filter((s) => s !== name));
    setPortfolioCompaniesState((prev) =>
      prev.map((c) => ({
        ...c,
        servicesTaken: c.servicesTaken.filter((s) => s !== name),
      }))
    );
    toast.success(`"${name}" hizmeti kaldırıldı`);
  }, []);

  const handleAddTag = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTagList((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'tr'));
    });
  }, []);

  const handleSetTagService = useCallback((tag: string, serviceType: string | null) => {
    setTagServiceMap((prev) => {
      if (!serviceType) {
        const next = { ...prev };
        delete next[tag];
        return next;
      }
      return { ...prev, [tag]: serviceType };
    });
  }, []);

  const handleSelectPortfolioCompany = useCallback((companyId: string) => {
    setSelectedPortfolioCompanyId(companyId);
    setCurrentView('portfolio');
  }, []);

  const handleCreatePortfolioCompany = useCallback((payload: PortfolioCompanyDraft) => {
    if (!canManagePortfolio) {
      toast.error('Portföy kaydı oluşturma yetkiniz yok.');
      return;
    }

    const prev = portfolioCompaniesState;
    const baseSlug = slugify(payload.name);
    const baseId = `${baseSlug}-${Date.now()}`;
    let nextId = baseId;
    let suffix = 1;
    while (prev.some((company) => company.id === nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const newCompany: PortfolioCompany = {
      id: nextId,
      name: payload.name,
      status: payload.status,
      startDate: payload.startDate,
      exitDate: payload.exitDate,
      servicesTaken: payload.servicesTaken,
      monthlyQuotas: payload.monthlyQuotas,
      socialMediaAccounts: [],
      brandIdentity: payload.brandIdentity ?? {
        logos: [],
        logoAttachments: [],
        colorPalette: ['#111827', '#E5E7EB'],
        fonts: ['Inter'],
        brandTone: 'Corporate',
      },
      contacts: [],
      assignedTeamMemberIds: [],
      monthlyContentCalendar: [],
      notes: payload.notes,
      activityLog: [
        createActivityLog(nextId, 'Portfolio created', `${payload.name} portföy kaydı oluşturuldu.`),
      ],
    };

    setPortfolioCompaniesState((current) => [...current, newCompany]);
    setSelectedPortfolioCompanyId(nextId);
    setCurrentView('portfolio');

    toast.success('Portföy kaydı eklendi');
  }, [canManagePortfolio, portfolioCompaniesState]);

  const handleUpdatePortfolioCompany = useCallback((companyId: string, payload: PortfolioCompanyDraft) => {
    if (!canManagePortfolio) {
      toast.error('Portföy kaydı güncelleme yetkiniz yok.');
      return;
    }

    const companyExists = portfolioCompaniesState.some((c) => c.id === companyId);
    if (!companyExists) {
      toast.error('Güncellenecek şirket bulunamadı.');
      return;
    }

    setPortfolioCompaniesState((prev) =>
      prev.map((company) => {
        if (company.id !== companyId) return company;
        return {
          ...company,
          name: payload.name,
          status: payload.status,
          startDate: payload.startDate,
          exitDate: payload.exitDate,
          servicesTaken: payload.servicesTaken,
          monthlyQuotas: payload.monthlyQuotas,
          notes: payload.notes,
          socialMediaAccounts: payload.socialMediaAccounts ?? company.socialMediaAccounts,
          brandIdentity: payload.brandIdentity ?? company.brandIdentity,
          contacts: payload.contacts ?? company.contacts,
          assignedTeamMemberIds: payload.assignedTeamMemberIds ?? company.assignedTeamMemberIds,
          monthlyContentCalendar: payload.monthlyContentCalendar ?? company.monthlyContentCalendar,
          activityLog: [
            ...company.activityLog,
            createActivityLog(company.id, 'Portfolio updated', `${payload.name} portföy kaydı güncellendi.`),
          ],
        };
      })
    );

    toast.success('Portföy kaydı güncellendi');
  }, [canManagePortfolio, portfolioCompaniesState, selectedPortfolioCompanyId]);

  const handleDeletePortfolioCompany = useCallback((companyId: string) => {
    if (!canManagePortfolio) {
      toast.error('Portföy kaydı silme yetkiniz yok.');
      return;
    }

    const target = portfolioCompaniesState.find((company) => company.id === companyId);
    if (!target) {
      toast.error('Silinecek şirket bulunamadı.');
      return;
    }

    setPortfolioCompaniesState((prev) => prev.filter((company) => company.id !== companyId));

    if (selectedPortfolioCompanyId === companyId) {
      setSelectedPortfolioCompanyId(null);
    }

    toast.success('Portföy kaydı silindi');
  }, [canManagePortfolio, portfolioCompaniesState, selectedPortfolioCompanyId]);

  const handleOpenTaskDetail = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleUpdateTask = useCallback(
    (
      taskId: string,
      payload: {
        title: string;
        description: string;
        status: TaskStatus;
        priority: Priority;
        assigneeId: string;
        portfolioCompanyId: string;
        startDate?: Date;
        dueDate?: Date;
        progress: number;
        tags: string[];
        customFields?: Record<string, string>;
      }
    ) => {
      const assignee = users.find((u) => u.id === payload.assigneeId);
      const portfolioCompany = portfolioCompaniesState.find(
        (company) => company.id === payload.portfolioCompanyId
      );
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const entries: ActivityLogItem[] = [];
          if (payload.title !== task.title) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Başlık değiştirildi',
                `"${task.title}" → "${payload.title}"`
              )
            );
          }
          if ((payload.description ?? '') !== (task.description ?? '')) {
            entries.push(createTaskActivityLog(taskId, 'Açıklama güncellendi', ''));
          }
          if (payload.status !== task.status) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Durum değiştirildi',
                `${statusLabels[task.status]} → ${statusLabels[payload.status]}`
              )
            );
          }
          if (payload.priority !== task.priority) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Öncelik değiştirildi',
                `${priorityLabels[task.priority]} → ${priorityLabels[payload.priority]}`
              )
            );
          }
          if (payload.assigneeId !== (task.assignee?.id ?? '')) {
            const oldName = task.assignee?.name ?? 'Atanmadı';
            const newName = assignee?.name ?? 'Atanmadı';
            entries.push(
              createTaskActivityLog(taskId, 'Atanan kişi değiştirildi', `${oldName} → ${newName}`)
            );
          }
          if (payload.portfolioCompanyId !== (task.portfolioCompanyId ?? '')) {
            const oldName = task.portfolioCompanyName ?? 'Atanmamış';
            const newName = portfolioCompany?.name ?? 'Atanmamış';
            entries.push(
              createTaskActivityLog(taskId, 'Portföy değiştirildi', `${oldName} → ${newName}`)
            );
          }
          const oldStart =
            task.createdAt instanceof Date ? task.createdAt : task.createdAt ? new Date(task.createdAt) : undefined;
          const newStart = payload.startDate;
          const oldStartStr = oldStart ? format(oldStart, 'd MMM yyyy', { locale: tr }) : '';
          const newStartStr = newStart ? format(newStart, 'd MMM yyyy', { locale: tr }) : '';
          if (newStart && oldStartStr !== newStartStr) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Başlangıç tarihi değiştirildi',
                `${oldStartStr || '-'} → ${newStartStr}`
              )
            );
          }
          const oldDue = task.dueDate;
          const newDue = payload.dueDate;
          const oldDueStr = oldDue ? format(oldDue, 'd MMM yyyy', { locale: tr }) : '';
          const newDueStr = newDue ? format(newDue, 'd MMM yyyy', { locale: tr }) : '';
          if (oldDueStr !== newDueStr) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Son teslim tarihi değiştirildi',
                `${oldDueStr || '-'} → ${newDueStr || '-'}`
              )
            );
          }
          if (payload.progress !== task.progress) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Tamamlanma oranı değiştirildi',
                `%${task.progress} → %${payload.progress}`
              )
            );
          }
          const tagsEqual =
            payload.tags.length === task.tags.length &&
            payload.tags.every((t, i) => t === task.tags[i]);
          if (!tagsEqual) {
            entries.push(
              createTaskActivityLog(
                taskId,
                'Etiketler güncellendi',
                payload.tags.length ? payload.tags.join(', ') : '(boş)'
              )
            );
          }
          return {
            ...task,
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            assignee,
            portfolioCompanyId: portfolioCompany?.id,
            portfolioCompanyName: portfolioCompany?.name,
            ...(payload.startDate !== undefined && { createdAt: payload.startDate }),
            dueDate: payload.dueDate,
            progress: payload.progress,
            tags: payload.tags,
            customFields: payload.customFields ?? task.customFields,
            updatedAt: new Date(),
            activityLog:
              entries.length > 0
                ? [...(task.activityLog ?? []), ...entries]
                : task.activityLog,
          };
        })
      );
      toast.success('Görev güncellendi');
      setSelectedTaskId(null);
    },
    [portfolioCompaniesState]
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) return;
    const confirmed = window.confirm(`"${targetTask.title}" görevini silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    toast.success('Görev silindi');
    setSelectedTaskId(null);
  }, [tasks]);

  const handleTableTaskAssigneeCommit = useCallback((taskId: string, assigneeId: string | null) => {
    const assignee = assigneeId ? users.find((u) => u.id === assigneeId) : undefined;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if ((task.assignee?.id ?? null) === (assigneeId ?? null)) return task;
        const oldName = task.assignee?.name ?? 'Atanmamış';
        const newName = assignee?.name ?? 'Atanmamış';
        const entry = createTaskActivityLog(
          taskId,
          'Atanan kişi değiştirildi',
          `${oldName} → ${newName}`
        );
        return {
          ...task,
          assignee,
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success('Tasarımcı güncellendi');
  }, []);

  const handleTableTaskPriorityCommit = useCallback((taskId: string, priority: Priority) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if (task.priority === priority) return task;
        const entry = createTaskActivityLog(
          taskId,
          'Öncelik değiştirildi',
          `${priorityLabels[task.priority]} → ${priorityLabels[priority]}`
        );
        const nextBase = { ...task, priority, updatedAt: new Date() };
        return {
          ...nextBase,
          progress: getTaskProgress(nextBase),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success('Öncelik güncellendi');
  }, []);

  const handleTableTaskStatusCommit = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if (task.status === status) return task;
        const entry = createTaskActivityLog(
          taskId,
          'Durum değiştirildi',
          `${statusLabels[task.status]} → ${statusLabels[status]}`
        );
        const nextBase = { ...task, status, updatedAt: new Date() };
        return {
          ...nextBase,
          progress: getTaskProgress(nextBase),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success('Durum güncellendi');
  }, []);

  const handleTableTaskDescriptionCommit = useCallback((taskId: string, description: string) => {
    let didChange = false;
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const prevDesc = (task.description ?? '').trim();
      if (prevDesc === description) return prev;
      didChange = true;
      const entry = createTaskActivityLog(taskId, 'Açıklama güncellendi', '');
      const nextDesc = description.length > 0 ? description : undefined;
      return prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              description: nextDesc,
              updatedAt: new Date(),
              activityLog: [...(t.activityLog ?? []), entry],
            }
          : t
      );
    });
    if (didChange) toast.success('Brief güncellendi');
  }, []);

  const handleBulkDeleteTasks = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    setSelectedTaskId((cur) => (cur && ids.includes(cur) ? null : cur));
    toast.success(ids.length === 1 ? 'Görev silindi' : `${ids.length} görev silindi`);
  }, []);

  const handleBulkReassignTasks = useCallback((ids: string[], assigneeId: string) => {
    if (ids.length === 0) return;
    const assignee = users.find((u) => u.id === assigneeId);
    setTasks((prev) =>
      prev.map((task) => {
        if (!ids.includes(task.id)) return task;
        const oldName = task.assignee?.name ?? 'Atanmamış';
        const newName = assignee?.name ?? 'Atanmamış';
        const entry = createTaskActivityLog(
          task.id,
          'Atanan kişi değiştirildi',
          `${oldName} → ${newName} (toplu devret)`
        );
        return {
          ...task,
          assignee,
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success(
      ids.length === 1 ? 'Görev devredildi' : `${ids.length} görev devredildi`
    );
  }, []);

  const handleBulkArchiveTasks = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setTasks((prev) =>
      prev.map((task) => {
        if (!ids.includes(task.id)) return task;
        const entry = createTaskActivityLog(
          task.id,
          'Görev arşivlendi',
          'Ana listeden gizlendi'
        );
        return {
          ...task,
          archived: true,
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success(
      ids.length === 1 ? 'Görev arşivlendi' : `${ids.length} görev arşivlendi`
    );
  }, []);

  const handleRestoreFromArchive = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setTasks((prev) =>
      prev.map((task) => {
        if (!ids.includes(task.id)) return task;
        const entry = createTaskActivityLog(
          task.id,
          'Arşivden çıkarıldı',
          'Görev ana listelere geri alındı.'
        );
        return {
          ...task,
          archived: undefined,
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success(
      ids.length === 1 ? 'Görev arşivden çıkarıldı' : `${ids.length} görev arşivden çıkarıldı`
    );
  }, []);

  const handleAddAttachment = useCallback((taskId: string, attachment: TaskAttachment) => {
    const entry = createTaskActivityLog(taskId, 'Belge eklendi', attachment.name);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              attachments: [...(task.attachments ?? []), attachment],
              updatedAt: new Date(),
              activityLog: [...(task.activityLog ?? []), entry],
            }
          : task
      )
    );
    toast.success('Belge eklendi');
  }, []);

  const handleRemoveAttachment = useCallback((taskId: string, attachmentId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const removed = (task.attachments ?? []).find((a) => a.id === attachmentId);
        const entry = createTaskActivityLog(
          taskId,
          'Belge kaldırıldı',
          removed?.name ?? 'Belge'
        );
        return {
          ...task,
          attachments: (task.attachments ?? []).filter((a) => a.id !== attachmentId),
          updatedAt: new Date(),
          activityLog: [...(task.activityLog ?? []), entry],
        };
      })
    );
    toast.success('Belge kaldırıldı');
  }, []);

  const handleCreateTask = useCallback(
    (taskData: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: Priority;
      assigneeId: string;
      portfolioCompanyId: string;
      dueDate: Date | undefined;
      tags: string[];
    }) => {
      const assignee = users.find((u) => u.id === taskData.assigneeId);
      const portfolioCompany = portfolioCompaniesState.find(
        (company) => company.id === taskData.portfolioCompanyId
      );
      const assigneeName = assignee ? `${assignee.name} kişisine atandı` : 'atanmadı';
      const statusLabel = statusLabels[taskData.status];
      const now = new Date();
      const taskId = `task-${Date.now()}`;
      const taskBase: Task = {
        id: taskId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignee,
        portfolioCompanyId: portfolioCompany?.id,
        portfolioCompanyName: portfolioCompany?.name,
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        progress: 0,
        createdAt: now,
        updatedAt: now,
        customFields: {},
        activityLog: [
          createTaskActivityLog(
            taskId,
            'Görev oluşturuldu',
            `${statusLabel} durumuna eklendi. ${assigneeName}.`
          ),
        ],
      };
      const newTask: Task = {
        ...taskBase,
        progress: getTaskProgress(taskBase),
      };

      setTasks((prev) => [...prev, newTask]);

      toast.success('Görev oluşturuldu!', {
        description: `"${taskData.title}" görevi ${statusLabel} durumuna eklendi (${assigneeName}).`,
      });
    },
    [portfolioCompaniesState]
  );

  /** Tahta sütun başlığındaki +: diyalog açmadan varsayılan görev */
  const handleAddQuickBoardTask = useCallback((columnId: string) => {
    const status = columnId as TaskStatus;
    const valid: TaskStatus[] = ['brief', 'in-progress', 'review', 'revision', 'done'];
    if (!valid.includes(status)) return;
    const statusLabel = statusLabels[status];
    const now = new Date();
    const taskId = `task-${Date.now()}`;
    const title = 'Yeni görev';
    const taskBase: Task = {
      id: taskId,
      title,
      description: undefined,
      status,
      priority: 'medium',
      tags: [],
      progress: 0,
      createdAt: now,
      updatedAt: now,
      customFields: {},
      activityLog: [
        createTaskActivityLog(
          taskId,
          'Görev oluşturuldu',
          `"${title}" ${statusLabel} sütununa eklendi.`
        ),
      ],
    };
    const newTask: Task = {
      ...taskBase,
      progress: getTaskProgress(taskBase),
    };
    setTasks((prev) => [...prev, newTask]);
    toast.success('Görev eklendi', { description: `"${title}" ${statusLabel} sütununa eklendi.` });
  }, []);

  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId) ?? null
    : null;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectPerson={handleSelectPerson}
        onClearAllData={handleClearAllData}
      />

      {/* Mobile Sidebar Drawer */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 gap-0">
          <div className="h-full overflow-hidden">
            <Sidebar
              currentView={currentView}
              onViewChange={(view) => {
                handleViewChange(view);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onSelectPerson={(id) => {
                handleSelectPerson(id);
                setIsMobileSidebarOpen(false);
              }}
              onClearAllData={handleClearAllData}
              embedded
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentView={currentView}
          onViewChange={handleViewChange}
          onAddTask={() => handleAddTask()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          assigneeFilter={globalAssigneeFilter}
          onAssigneeFilterChange={setGlobalAssigneeFilter}
          statusFilter={globalStatusFilter}
          onStatusFilterChange={setGlobalStatusFilter}
          overdueOnly={globalOverdueOnly}
          onOverdueOnlyChange={setGlobalOverdueOnly}
          sortBy={globalSortBy}
          onSortByChange={setGlobalSortBy}
          sortDir={globalSortDir}
          onSortDirChange={setGlobalSortDir}
          onOpenMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50/50">
          <AppViewRouter
            currentView={currentView}
            filteredTasks={filteredTasks}
            archivedTasks={archivedTasks}
            tasks={tasks}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            tableColumnSchema={tableColumnSchema}
            setTableColumnSchema={setTableColumnSchema}
            handleTaskCustomFieldChange={handleTaskCustomFieldChange}
            handleRemoveColumnFromTasks={handleRemoveColumnFromTasks}
            globalAssigneeFilter={globalAssigneeFilter}
            setGlobalAssigneeFilter={setGlobalAssigneeFilter}
            globalStatusFilter={globalStatusFilter}
            setGlobalStatusFilter={setGlobalStatusFilter}
            globalSortBy={globalSortBy}
            setGlobalSortBy={setGlobalSortBy}
            globalSortDir={globalSortDir}
            setGlobalSortDir={setGlobalSortDir}
            handleTableTaskAssigneeCommit={handleTableTaskAssigneeCommit}
            handleTableTaskPriorityCommit={handleTableTaskPriorityCommit}
            handleTableTaskStatusCommit={handleTableTaskStatusCommit}
            handleTableTaskDescriptionCommit={handleTableTaskDescriptionCommit}
            handleBulkDeleteTasks={handleBulkDeleteTasks}
            handleBulkReassignTasks={handleBulkReassignTasks}
            handleBulkArchiveTasks={handleBulkArchiveTasks}
            handleRestoreFromArchive={handleRestoreFromArchive}
            portfolioCompaniesState={portfolioCompaniesState}
            selectedPortfolioCompanyId={selectedPortfolioCompanyId}
            currentUserRole={currentUserRole}
            canManagePortfolio={canManagePortfolio}
            handleSelectPortfolioCompany={handleSelectPortfolioCompany}
            handleBackToPortfolioOverview={handleBackToPortfolioOverview}
            handleCreatePortfolioCompany={handleCreatePortfolioCompany}
            handleUpdatePortfolioCompany={handleUpdatePortfolioCompany}
            handleDeletePortfolioCompany={handleDeletePortfolioCompany}
            serviceTypes={serviceTypes}
            handleAddServiceType={handleAddServiceType}
            handleRemoveServiceType={handleRemoveServiceType}
            setTasks={setTasks}
            handleAddTask={handleAddTask}
            handleAddQuickBoardTask={handleAddQuickBoardTask}
            handleOpenTaskDetail={handleOpenTaskDetail}
            handleTaskDatesChange={handleTaskDatesChange}
            selectedPersonId={selectedPersonId}
            setSelectedPersonId={setSelectedPersonId}
            setCurrentView={setCurrentView}
            handleSelectPerson={handleSelectPerson}
            tagServiceMap={tagServiceMap}
            handleAddAttachment={handleAddAttachment}
          />
        </main>
      </div>

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onClose={() => setIsAddTaskDialogOpen(false)}
        onAdd={handleCreateTask}
        portfolioOptions={portfolioTaskOptions}
        defaultStatus={addTaskDefaultStatus}
        defaultDueDate={addTaskDefaultDueDate}
        defaultAssigneeId={addTaskDefaultAssigneeId}
        availableTags={tagList}
        onAddTag={handleAddTag}
        tagServiceMap={tagServiceMap}
        onSetTagService={handleSetTagService}
      />

      <TaskDetailDialog
        open={Boolean(selectedTask)}
        task={selectedTask}
        portfolioOptions={portfolioTaskOptions}
        tableColumnSchema={tableColumnSchema}
        onClose={handleCloseTaskDetail}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={(taskId) => {
          handleBulkArchiveTasks([taskId]);
          handleCloseTaskDetail();
        }}
        onRestoreFromArchive={(taskId) => {
          handleRestoreFromArchive([taskId]);
          handleCloseTaskDetail();
        }}
        onAddAttachment={handleAddAttachment}
        onRemoveAttachment={handleRemoveAttachment}
        availableTags={tagList}
        onAddTag={handleAddTag}
        tagServiceMap={tagServiceMap}
        onSetTagService={handleSetTagService}
      />
    </div>
  );
}

export default App;
