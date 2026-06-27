import { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { AppViewRouter } from '@/components/app/AppViewRouter';
import { RecentlyDeletedPage } from '@/components/RecentlyDeletedPage';
import { UsersManagementView } from '@/components/users/UsersManagementView';
import { LoginPage } from '@/components/LoginPage';
import { WorkspaceListPage } from '@/pages/WorkspaceListPage';
import { WorkspaceSettingsPage } from '@/pages/WorkspaceSettingsPage';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type {
  ActivityLogItem,
  AppRole,
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
  User,
  UserPermissions,
  ViewType,
} from '@/types';
import { DEFAULT_MEMBER_PERMISSIONS } from '@/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { PRIORITY_LABELS as priorityLabels, STATUS_LABELS as statusLabels } from '@/lib/constants';
import { getTaskProgress } from '@/lib/taskProgress';
import { isTaskOverdue } from '@/lib/taskOverdue';
import * as api from '@/lib/api';
import { UsersProvider } from '@/contexts/UsersContext';
import { useTimer } from '@/contexts/TimerContext';
import {
  OLD_CUSTOM_COLUMNS_KEY,
  TABLE_SCHEMA_STORAGE_KEY,
  VIEW_STORAGE_KEY,
} from '@/lib/gevezeStorageKeys';

/** Seçim + ⋮ menü sığsın; dar sütun grid taşmasıyla başlığın üstüne biner */
const MIN_TABLE_SELECT_COL_PX = 72;

/** Eski kayıtlardan gelen "Yorum" sütununu kaldırır */
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
          return { platform: account.platform, handle: account.handle, url: account.url, visibleTo };
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
          return { name: contact.name, role: contact.role, email: contact.email, phone: contact.phone };
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
          return { id: log.id, date: log.date, author: log.author, action: log.action, note: log.note };
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

// ─── Loading screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Veriler yükleniyor…</p>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

// URL path → ViewType
const PATH_TO_VIEW: Record<string, ViewType> = {
  dashboard: 'dashboard',
  table: 'table',
  board: 'board',
  timeline: 'timeline',
  calendar: 'calendar',
  portfolio: 'portfolio',
  analytics: 'analytics',
  archive: 'archive',
  deleted: 'trash',
  members: 'users',
  person: 'person',
  settings: 'settings',
};

const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: 'dashboard',
  table: 'table',
  board: 'board',
  timeline: 'timeline',
  calendar: 'calendar',
  portfolio: 'portfolio',
  analytics: 'analytics',
  archive: 'archive',
  trash: 'deleted',
  users: 'members',
  person: 'person',
  settings: 'settings',
};

function App() {
  const { token, clearAuth, user: authUser } = useAuth();

  useEffect(() => {
    api.setUnauthorizedHandler(clearAuth);
  }, [clearAuth]);

  if (!token) return <><Toaster position="top-right" richColors /><LoginPage /></>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="/workspaces" element={<WorkspaceListPage />} />
      <Route
        path="/workspaces/:workspaceId/*"
        element={<AuthenticatedApp onLogout={clearAuth} authUser={authUser} />}
      />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}

function AuthenticatedApp({ onLogout, authUser }: { onLogout: () => void; authUser: { id: string; role: string } | null }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { setCurrentWorkspaceById } = useWorkspace();
  const { activeTimer, startTimer: timerStart, stopTimer: timerStop } = useTimer();

  // URL'deki son segment'ten view'ı türet
  const viewFromUrl = useMemo((): ViewType => {
    const segments = location.pathname.split('/').filter(Boolean);
    const segment = segments[segments.length - 1] ?? 'dashboard';
    return PATH_TO_VIEW[segment] ?? 'dashboard';
  }, [location.pathname]);

  // WorkspaceContext'i URL'deki workspaceId ile senkronize et
  useEffect(() => {
    if (workspaceId) setCurrentWorkspaceById(workspaceId);
  }, [workspaceId, setCurrentWorkspaceById]);

  // ── UI state ──
  const [currentView, setCurrentView] = useState<ViewType>(viewFromUrl);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [addTaskDefaultStatus, setAddTaskDefaultStatus] = useState<TaskStatus>('brief');
  const [addTaskDefaultDueDate, setAddTaskDefaultDueDate] = useState<Date | undefined>();
  const [addTaskDefaultAssigneeId, setAddTaskDefaultAssigneeId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPortfolioCompanyId, setSelectedPortfolioCompanyId] = useState<string | null>(null);
  const [tableColumnSchema, setTableColumnSchema] = useState<TableColumnSchemaItem[]>(loadTableColumnSchema);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalAssigneeFilter, setGlobalAssigneeFilter] = useState<string>('');
  const [globalStatusFilter, setGlobalStatusFilter] = useState<string>('');
  const [globalOverdueOnly, setGlobalOverdueOnly] = useState(false);
  const [globalSortBy, setGlobalSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [globalSortDir, setGlobalSortDir] = useState<'asc' | 'desc'>('asc');
  // ── Server state (API) ──
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [portfolioCompaniesState, setPortfolioCompaniesState] = useState<PortfolioCompany[]>([]);
  const [tagEntries, setTagEntries] = useState<{ id: string; name: string; color: string }[]>([]);
  const [serviceTypeEntries, setServiceTypeEntries] = useState<{ id: string; name: string }[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, unknown>>({});

  // ── Derived lists ──
  const tagList = useMemo(() => tagEntries.map((e) => e.name), [tagEntries]);
  const tagColorMap = useMemo(
    () => Object.fromEntries(tagEntries.map((e) => [e.name, e.color])),
    [tagEntries]
  );
  const serviceTypes = useMemo(() => serviceTypeEntries.map((e) => e.name), [serviceTypeEntries]);

  const appRole = authUser?.role ?? 'member';
  const isManager = appRole === 'admin' || appRole === 'manager';
  const currentUserRole: PortfolioRole = isManager ? 'manager' : 'editor';

  // Per-user permission derivation — managers/admins always have full access
  const currentUserPerms = useMemo(() => {
    if (isManager) return null; // always full access
    return users.find(u => u.id === authUser?.id)?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
  }, [isManager, users, authUser]);

  const effectivePerms = useMemo(() => ({
    canViewAnalytics:    isManager || (currentUserPerms?.canViewAnalytics ?? false),
    canViewArchive:      isManager || (currentUserPerms?.canViewArchive ?? true),
    canViewTrash:        isManager || (currentUserPerms?.canViewTrash ?? true),
    canManagePortfolio:  isManager || (currentUserPerms?.canManagePortfolio ?? false),
    canCreateTasks:      isManager || (currentUserPerms?.canCreateTasks ?? true),
    canDeleteTasks:      isManager || (currentUserPerms?.canDeleteTasks ?? false),
    canEditOthersTasks:  isManager || (currentUserPerms?.canEditOthersTasks ?? false),
  }), [isManager, currentUserPerms]);

  const canManagePortfolio = effectivePerms.canManagePortfolio;
  const companyName = typeof appSettings['companyName'] === 'string'
    ? appSettings['companyName']
    : 'Geveze';
  const workspaceDescription = typeof appSettings['workspaceDescription'] === 'string'
    ? appSettings['workspaceDescription']
    : 'Ajans iş takibi';

  // ── Initial data fetch (workspace değişince yeniden çalışır) ──
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.getUsers(),
      api.getTags(workspaceId),
      api.getServiceTypes(workspaceId),
      api.getPortfolio(),
      api.getSettings(workspaceId),
    ])
      .then(async ([fetchedUsers, fetchedTags, fetchedSTs, fetchedPortfolio, fetchedSettings]) => {
        setUsers(fetchedUsers);
        setTagEntries(fetchedTags);
        setServiceTypeEntries(fetchedSTs);
        setPortfolioCompaniesState(
          fetchedPortfolio.map((c) => normalizePortfolioCompany(c) ?? c)
        );
        setAppSettings(fetchedSettings);
        const [fetchedTasks, fetchedDeleted] = await Promise.all([
          api.getTasks(fetchedUsers, { workspaceId }),
          api.getDeletedTasks(fetchedUsers, workspaceId),
        ]);
        setTasks(fetchedTasks);
        setDeletedTasks(fetchedDeleted);
      })
      .catch(() => {
        toast.error('API bağlantı hatası — veriler yüklenemedi', {
          description: 'API sunucusunun çalıştığından emin olun (npm run api)',
        });
      })
      .finally(() => setIsLoading(false));
  }, [workspaceId]);

  // URL değişince currentView state'ini senkronize et
  useEffect(() => {
    setCurrentView(viewFromUrl);
  }, [viewFromUrl]);

  useEffect(() => {
    window.localStorage.setItem(TABLE_SCHEMA_STORAGE_KEY, JSON.stringify(tableColumnSchema));
  }, [tableColumnSchema]);

  // ── Derived / filtered tasks ──
  const portfolioTaskOptions = useMemo(
    () =>
      portfolioCompaniesState
        .map((company) => ({ id: company.id, name: company.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [portfolioCompaniesState]
  );

  const filteredTasks = useMemo(() => {
    const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTaskCustomFieldChange = useCallback(
    (taskId: string, columnId: string, value: string) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, customFields: { ...task.customFields, [columnId]: value }, updatedAt: new Date() }
            : task
        )
      );
      // Fire-and-forget API sync for custom field changes
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        api
          .updateTask(taskId, { customFields: { ...(task.customFields ?? {}), [columnId]: value } }, users)
          .catch(() => { /* silent */ });
      }
    },
    [tasks, users]
  );

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
    if (!window.confirm('Tüm yerel tercihler sıfırlanacak ve sayfa yenilenecek. Emin misiniz?')) return;
    window.localStorage.removeItem(VIEW_STORAGE_KEY);
    window.localStorage.removeItem(TABLE_SCHEMA_STORAGE_KEY);
    window.location.reload();
  }, []);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const handleViewChange = useCallback((view: ViewType) => {
    if (view === 'portfolio') setSelectedPortfolioCompanyId(null);
    const path = VIEW_TO_PATH[view] ?? 'dashboard';
    navigate(`/workspaces/${workspaceId ?? ''}/${path}`);
  }, [navigate, workspaceId]);

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

  const handleTaskDatesChange = useCallback(
    (taskId: string, startDate: Date, dueDate: Date) => {
      const entry = createTaskActivityLog(
        taskId,
        'Tarihler güncellendi',
        `${format(startDate, 'd MMM yyyy', { locale: tr })} - ${format(dueDate, 'd MMM yyyy', { locale: tr })} aralığına taşındı.`
      );
      api
        .updateTask(
          taskId,
          { startDate: startDate.toISOString(), dueDate: dueDate.toISOString(), activityLog: [entry] },
          users
        )
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        })
        .catch(() => toast.error('Tarih güncellenemedi'));
      toast.success('Görev tarihleri güncellendi');
    },
    [users]
  );

  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setCurrentView('person');
  }, []);

  const handleBackToPortfolioOverview = useCallback(() => {
    setSelectedPortfolioCompanyId(null);
  }, []);

  const handleAddServiceType = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (serviceTypeEntries.some((e) => e.name === trimmed)) return;
      api
        .createServiceType(trimmed)
        .then((entry) => {
          setServiceTypeEntries((prev) =>
            [...prev, entry].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          );
          toast.success(`"${trimmed}" hizmeti eklendi`);
        })
        .catch(() => toast.error('Hizmet eklenemedi'));
    },
    [serviceTypeEntries]
  );

  const handleRemoveServiceType = useCallback(
    (name: string) => {
      const entry = serviceTypeEntries.find((e) => e.name === name);
      if (!entry) return;
      api
        .deleteServiceType(entry.id)
        .then(() => {
          setServiceTypeEntries((prev) => prev.filter((e) => e.id !== entry.id));
          setPortfolioCompaniesState((prev) =>
            prev.map((c) => ({ ...c, servicesTaken: c.servicesTaken.filter((s) => s !== name) }))
          );
          toast.success(`"${name}" hizmeti kaldırıldı`);
        })
        .catch(() => toast.error('Hizmet kaldırılamadı'));
    },
    [serviceTypeEntries]
  );

  const handleAddTag = useCallback(
    (name: string, color = '#6161FF') => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (tagEntries.some((e) => e.name === trimmed)) return;
      api
        .createTag(trimmed, color)
        .then((entry) => {
          setTagEntries((prev) =>
            [...prev, entry].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          );
        })
        .catch(() => { /* silent */ });
    },
    [tagEntries]
  );

  // ── User management handlers ──────────────────────────────────────────────
  const handleCreateUser = useCallback(async (data: {
    email: string; name: string; initials: string; color: string;
    title?: string; role: string; password: string;
  }) => {
    const created = await api.createUser(data);
    setUsers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
    toast.success(`${created.name} oluşturuldu`);
  }, []);

  const handleUpdateUser = useCallback(async (id: string, data: Partial<User>) => {
    const updated = await api.updateUser(id, data);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    toast.success('Kullanıcı güncellendi');
  }, []);

  const handleDeleteUser = useCallback(async (id: string) => {
    await api.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const handleUpdateUserPermissions = useCallback(async (id: string, permissions: UserPermissions) => {
    const updated = await api.updateUserPermissions(id, permissions);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    toast.success('İzinler güncellendi');
  }, []);

  const handleResetUserPassword = useCallback(async (id: string, newPassword: string) => {
    await api.resetUserPassword(id, newPassword);
  }, []);

  const handleUpdateUserRole = useCallback(async (id: string, role: AppRole) => {
    const updated = await api.updateUserRole(id, role);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    toast.success('Rol güncellendi');
  }, []);

  const handleSelectPortfolioCompany = useCallback((companyId: string) => {
    setSelectedPortfolioCompanyId(companyId);
    setCurrentView('portfolio');
  }, []);

  const handleCreatePortfolioCompany = useCallback(
    (payload: PortfolioCompanyDraft) => {
      if (!canManagePortfolio) {
        toast.error('Portföy kaydı oluşturma yetkiniz yok.');
        return;
      }
      api
        .createPortfolioCompany(payload)
        .then((created) => {
          const normalized = normalizePortfolioCompany(created) ?? created;
          setPortfolioCompaniesState((prev) => [...prev, normalized]);
          setSelectedPortfolioCompanyId(normalized.id);
          setCurrentView('portfolio');
          toast.success('Portföy kaydı eklendi');
        })
        .catch(() => toast.error('Portföy kaydı oluşturulamadı'));
    },
    [canManagePortfolio]
  );

  const handleUpdatePortfolioCompany = useCallback(
    (companyId: string, payload: PortfolioCompanyDraft) => {
      if (!canManagePortfolio) {
        toast.error('Portföy kaydı güncelleme yetkiniz yok.');
        return;
      }
      api
        .updatePortfolioCompany(companyId, payload)
        .then((updated) => {
          const normalized = normalizePortfolioCompany(updated) ?? updated;
          setPortfolioCompaniesState((prev) =>
            prev.map((c) => (c.id === companyId ? normalized : c))
          );
          toast.success('Portföy kaydı güncellendi');
        })
        .catch(() => toast.error('Portföy kaydı güncellenemedi'));
    },
    [canManagePortfolio]
  );

  const handleDeletePortfolioCompany = useCallback(
    (companyId: string) => {
      if (!canManagePortfolio) {
        toast.error('Portföy kaydı silme yetkiniz yok.');
        return;
      }
      api
        .deletePortfolioCompany(companyId)
        .then(() => {
          setPortfolioCompaniesState((prev) => prev.filter((c) => c.id !== companyId));
          if (selectedPortfolioCompanyId === companyId) {
            setSelectedPortfolioCompanyId(null);
          }
          toast.success('Portföy kaydı silindi');
        })
        .catch(() => toast.error('Portföy kaydı silinemedi'));
    },
    [canManagePortfolio, selectedPortfolioCompanyId]
  );

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
      const portfolioCompany = portfolioCompaniesState.find((c) => c.id === payload.portfolioCompanyId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const entries: ActivityLogItem[] = [];
      if (payload.title !== task.title) {
        entries.push(createTaskActivityLog(taskId, 'Başlık değiştirildi', `"${task.title}" → "${payload.title}"`));
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
        entries.push(
          createTaskActivityLog(
            taskId,
            'Atanan kişi değiştirildi',
            `${task.assignee?.name ?? 'Atanmadı'} → ${assignee?.name ?? 'Atanmadı'}`
          )
        );
      }

      api
        .updateTask(
          taskId,
          {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            assigneeId: assignee?.id,
            assigneeName: assignee?.name,
            portfolioCompanyId: portfolioCompany?.id,
            portfolioCompanyName: portfolioCompany?.name,
            ...(payload.startDate && { startDate: payload.startDate.toISOString() }),
            dueDate: payload.dueDate?.toISOString(),
            progress: payload.progress,
            tags: payload.tags,
            customFields: payload.customFields,
            ...(entries.length > 0 && { activityLog: entries }),
          },
          users
        )
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Görev güncellendi');
          setSelectedTaskId(null);
        })
        .catch(() => toast.error('Görev güncellenemedi'));
    },
    [users, portfolioCompaniesState, tasks]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const targetTask = tasks.find((task) => task.id === taskId);
      if (!targetTask) return;
      const confirmed = window.confirm(`"${targetTask.title}" görevi son silinenler klasörüne taşınsın mı?`);
      if (!confirmed) return;
      api
        .deleteTask(taskId)
        .then(() => {
          const deletedTask = { ...targetTask, deletedAt: new Date().toISOString() };
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setDeletedTasks((prev) => [deletedTask, ...prev]);
          toast.success('Görev son silinenler klasörüne taşındı');
          setSelectedTaskId(null);
        })
        .catch(() => toast.error('Görev silinemedi'));
    },
    [tasks]
  );

  const handleTableTaskAssigneeCommit = useCallback(
    (taskId: string, assigneeId: string | null) => {
      const assignee = assigneeId ? users.find((u) => u.id === assigneeId) : undefined;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      if ((task.assignee?.id ?? null) === (assigneeId ?? null)) return;

      const entry = createTaskActivityLog(
        taskId,
        'Atanan kişi değiştirildi',
        `${task.assignee?.name ?? 'Atanmamış'} → ${assignee?.name ?? 'Atanmamış'}`
      );
      api
        .updateTask(
          taskId,
          { assigneeId: assignee?.id, assigneeName: assignee?.name, activityLog: [entry] },
          users
        )
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Tasarımcı güncellendi');
        })
        .catch(() => toast.error('Atama güncellenemedi'));
    },
    [users, tasks]
  );

  const handleTableTaskPriorityCommit = useCallback(
    (taskId: string, priority: Priority) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.priority === priority) return;
      const entry = createTaskActivityLog(
        taskId,
        'Öncelik değiştirildi',
        `${priorityLabels[task.priority]} → ${priorityLabels[priority]}`
      );
      const nextBase = { ...task, priority };
      api
        .updateTask(
          taskId,
          { priority, progress: getTaskProgress(nextBase), activityLog: [entry] },
          users
        )
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Öncelik güncellendi');
        })
        .catch(() => toast.error('Öncelik güncellenemedi'));
    },
    [tasks, users]
  );

  const handleTableTaskStatusCommit = useCallback(
    (taskId: string, status: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === status) return;
      const entry = createTaskActivityLog(
        taskId,
        'Durum değiştirildi',
        `${statusLabels[task.status]} → ${statusLabels[status]}`
      );
      const nextBase = { ...task, status };
      api
        .updateTask(
          taskId,
          { status, progress: getTaskProgress(nextBase), activityLog: [entry] },
          users
        )
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Durum güncellendi');
          // Bana atanmış görevde otomatik timer yönetimi
          if (task.assigneeId === authUser?.id) {
            const shouldRun = status === 'in-progress' || status === 'revision';
            const isThisTaskTimer = activeTimer?.taskId === task.id;
            if (shouldRun) {
              if (isThisTaskTimer) {
                // Zaten sayıyor
              } else if (activeTimer) {
                // Başka görev sayılıyor → durdur ve başlat
                timerStop().then(() =>
                  timerStart(task.id, task.title, task.workspaceId, task.portfolioCompanyId)
                ).catch(() => {});
              } else {
                void timerStart(task.id, task.title, task.workspaceId, task.portfolioCompanyId);
              }
            } else if (isThisTaskTimer) {
              void timerStop();
            }
          }
        })
        .catch(() => toast.error('Durum güncellenemedi'));
    },
    [tasks, users, authUser, activeTimer, timerStart, timerStop]
  );

  const handleTableTaskDescriptionCommit = useCallback(
    (taskId: string, description: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const prevDesc = (task.description ?? '').trim();
      if (prevDesc === description) return;
      const entry = createTaskActivityLog(taskId, 'Açıklama güncellendi', '');
      const nextDesc = description.length > 0 ? description : undefined;
      api
        .updateTask(taskId, { description: nextDesc, activityLog: [entry] }, users)
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Brief güncellendi');
        })
        .catch(() => toast.error('Brief güncellenemedi'));
    },
    [tasks, users]
  );

  const handleBulkDeleteTasks = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const deletedNow = new Date().toISOString();
      const movedTasks = tasks.filter((t) => ids.includes(t.id)).map((t) => ({ ...t, deletedAt: deletedNow }));
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      setDeletedTasks((prev) => [...movedTasks, ...prev]);
      setSelectedTaskId((cur) => (cur && ids.includes(cur) ? null : cur));
      toast.success(ids.length === 1 ? 'Görev son silinenler klasörüne taşındı' : `${ids.length} görev son silinenler klasörüne taşındı`);
      api.bulkDeleteTasks(ids).catch(() => {
        toast.error('Silme işlemi kısmen başarısız oldu');
        api.getTasks(users).then(setTasks).catch(() => { /* silent */ });
      });
    },
    [tasks, users, appRole, authUser]
  );

  const handleBulkReassignTasks = useCallback(
    (ids: string[], assigneeId: string) => {
      if (ids.length === 0) return;
      const assignee = users.find((u) => u.id === assigneeId);
      setTasks((prev) =>
        prev.map((task) => {
          if (!ids.includes(task.id)) return task;
          return { ...task, assignee, assigneeId, assigneeName: assignee?.name, updatedAt: new Date() };
        })
      );
      toast.success(ids.length === 1 ? 'Görev devredildi' : `${ids.length} görev devredildi`);
      api.bulkReassignTasks(ids, assigneeId, assignee?.name).catch(() => {
        toast.error('Devret işlemi kısmen başarısız oldu');
        api.getTasks(users).then(setTasks).catch(() => { /* silent */ });
      });
    },
    [users]
  );

  const handleBulkArchiveTasks = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setTasks((prev) =>
        prev.map((task) =>
          ids.includes(task.id) ? { ...task, archived: true, updatedAt: new Date() } : task
        )
      );
      toast.success(ids.length === 1 ? 'Görev arşivlendi' : `${ids.length} görev arşivlendi`);
      api.bulkArchiveTasks(ids).catch(() => {
        toast.error('Arşivleme kısmen başarısız oldu');
        api.getTasks(users).then(setTasks).catch(() => { /* silent */ });
      });
    },
    [users]
  );

  const handleRestoreFromArchive = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setTasks((prev) =>
        prev.map((task) =>
          ids.includes(task.id) ? { ...task, archived: false, updatedAt: new Date() } : task
        )
      );
      toast.success(ids.length === 1 ? 'Görev arşivden çıkarıldı' : `${ids.length} görev arşivden çıkarıldı`);
      Promise.all(ids.map((id) => api.setTaskArchived(id, false, users))).catch(() => {
        toast.error('Arşivden çıkarma kısmen başarısız oldu');
        api.getTasks(users, { archived: true }).then((archived) => {
          setTasks((prev) =>
            prev.map((t) => {
              const fromApi = archived.find((a) => a.id === t.id);
              return fromApi ?? t;
            })
          );
        }).catch(() => { /* silent */ });
      });
    },
    [users]
  );

  const handleRestoreFromTrash = useCallback(
    (taskId: string) => {
      api.restoreDeletedTask(taskId, users)
        .then((restored) => {
          setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
          setTasks((prev) => [restored, ...prev]);
          toast.success('Görev geri alındı');
        })
        .catch(() => toast.error('Görev geri alınamadı'));
    },
    [users]
  );

  const handlePermanentDeleteTask = useCallback(
    (taskId: string) => {
      api.permanentDeleteTask(taskId)
        .then(() => {
          setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
          toast.success('Görev kalıcı olarak silindi');
        })
        .catch(() => toast.error('Görev silinemedi'));
    },
    []
  );

  const handleBulkRestoreFromTrash = useCallback(
    (ids: string[]) => {
      Promise.all(ids.map((id) => api.restoreDeletedTask(id, users)))
        .then((restored) => {
          setDeletedTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
          setTasks((prev) => [...restored, ...prev]);
          toast.success(ids.length === 1 ? 'Görev geri alındı' : `${ids.length} görev geri alındı`);
        })
        .catch(() => toast.error('Geri alma kısmen başarısız oldu'));
    },
    [users]
  );

  const handleBulkPermanentDelete = useCallback(
    (ids: string[]) => {
      Promise.all(ids.map((id) => api.permanentDeleteTask(id)))
        .then(() => {
          setDeletedTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
          toast.success(ids.length === 1 ? 'Görev kalıcı silindi' : `${ids.length} görev kalıcı silindi`);
        })
        .catch(() => toast.error('Kalıcı silme kısmen başarısız oldu'));
    },
    []
  );

  const handleAddAttachment = useCallback(
    (taskId: string, attachment: TaskAttachment) => {
      api
        .addAttachment(taskId, attachment, users)
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Belge eklendi');
        })
        .catch(() => toast.error('Belge eklenemedi'));
    },
    [users]
  );

  const handleRemoveAttachment = useCallback(
    (taskId: string, attachmentId: string) => {
      api
        .removeAttachment(taskId, attachmentId, users)
        .then((updated) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          toast.success('Belge kaldırıldı');
        })
        .catch(() => toast.error('Belge kaldırılamadı'));
    },
    [users]
  );

  const handleTaskUpdate = useCallback((updated: Task) => {
    // API'den gelen ham nesneyi re-parse et (tarihler string gelebilir)
    const parsed = api.parseApiTask(updated as unknown as Record<string, unknown>, users);
    setTasks((prev) => prev.map((t) => (t.id === parsed.id ? parsed : t)));
  }, [users]);

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
      const portfolioCompany = portfolioCompaniesState.find((c) => c.id === taskData.portfolioCompanyId);
      const statusLabel = statusLabels[taskData.status];

      api
        .createTask(
          {
            title: taskData.title,
            description: taskData.description || undefined,
            status: taskData.status,
            priority: taskData.priority,
            workspaceId: workspaceId ?? undefined,
            assigneeId: assignee?.id,
            assigneeName: assignee?.name,
            portfolioCompanyId: portfolioCompany?.id,
            portfolioCompanyName: portfolioCompany?.name,
            dueDate: taskData.dueDate?.toISOString(),
            tags: taskData.tags,
          },
          users
        )
        .then((created) => {
          setTasks((prev) => [...prev, created]);
          toast.success('Görev oluşturuldu!', {
            description: `"${taskData.title}" görevi ${statusLabel} durumuna eklendi.`,
          });
        })
        .catch(() => toast.error('Görev oluşturulamadı'));
    },
    [users, portfolioCompaniesState]
  );

  const handleAddQuickBoardTask = useCallback(
    (columnId: string) => {
      const status = columnId as TaskStatus;
      const valid: TaskStatus[] = ['brief', 'in-progress', 'review', 'revision', 'done'];
      if (!valid.includes(status)) return;
      const statusLabel = statusLabels[status];
      api
        .createTask({ title: 'Yeni görev', status, priority: 'medium', tags: [] }, users)
        .then((created) => {
          setTasks((prev) => [...prev, created]);
          toast.success('Görev eklendi', { description: `"Yeni görev" ${statusLabel} sütununa eklendi.` });
        })
        .catch(() => toast.error('Görev eklenemedi'));
    },
    [users]
  );

  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId) ?? null
    : null;

  if (isLoading) return <LoadingScreen />;

  return (
    <UsersProvider users={users}>
    <div className="flex h-screen bg-white overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectPerson={handleSelectPerson}
        onClearAllData={handleClearAllData}
        onLogout={handleLogout}
        companyName={companyName}
        workspaceDescription={workspaceDescription}
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
              onLogout={handleLogout}
              companyName={companyName}
              workspaceDescription={workspaceDescription}
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
          companyName={companyName}
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
          canAddTask={effectivePerms.canCreateTasks && currentView !== 'users'}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50/50">
          {currentView === 'trash' ? (
            <RecentlyDeletedPage
              tasks={deletedTasks}
              onRestore={handleRestoreFromTrash}
              onPermanentDelete={handlePermanentDeleteTask}
              onBulkRestore={handleBulkRestoreFromTrash}
              onBulkPermanentDelete={handleBulkPermanentDelete}
            />
          ) : currentView === 'users' ? (
            <UsersManagementView
              currentUser={authUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUserPermissions={handleUpdateUserPermissions}
              onResetPassword={handleResetUserPassword}
              onUpdateUserRole={handleUpdateUserRole}
            />
          ) : currentView === 'settings' ? (
            <WorkspaceSettingsPage />
          ) : (
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
            handleAddAttachment={handleAddAttachment}
            workspaceId={workspaceId}
          />
          )}
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
        tagColorMap={tagColorMap}
        onAddTag={handleAddTag}
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
        onTaskUpdate={handleTaskUpdate}
        availableTags={tagList}
        tagColorMap={tagColorMap}
        onAddTag={handleAddTag}
      />
    </div>
    </UsersProvider>
  );
}

export default App;
