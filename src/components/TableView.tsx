import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageCircle,
  Link2,
  FileText,
  Download,
  Plus,
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  User as UserIcon,
  Archive,
  UserPlus,
  Check,
  X,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  initialColumns,
  priorityColors,
  priorityLabels,
  statusLabels,
  users,
} from '@/data/mockData';
import { TaskCommentsPanel } from '@/components/TaskCommentsPanel';
import type {
  CustomColumnType,
  TableColumnSchemaItem,
  Task,
  TaskStatus,
  User,
} from '@/types';
import {
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { isTaskOverdue } from '@/lib/taskOverdue';

const customColumnWidth = '160px';

/** App.tsx MIN_TABLE_SELECT_COL_PX ile aynı tutun (dar sütun → başlık üst üste biner) */
const MIN_SELECT_COL_PX = 72;

const DEFAULT_SCHEMA: TableColumnSchemaItem[] = [
  { id: 'select', label: '', width: `${MIN_SELECT_COL_PX}px`, type: 'base' },
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

const statusColors: Record<Task['status'], string> = {
  brief: '#64748B',
  'in-progress': '#F59E0B',
  review: '#6366F1',
  revision: '#EF4444',
  done: '#10B981',
};

/** Öncelik / durum hücresi: dolu arka plan + okunaklı beyaz metin */
function solidAccentCellStyle(hex: string): CSSProperties {
  return { backgroundColor: hex, color: '#ffffff' };
}

/** Tablo yorum: çizgili balon; boşken balon içinde +, yorum varken sağ altta dolu rozet + sayı */
function TableCommentButton({
  count,
  onOpen,
  className,
}: {
  count: number;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-9 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-gray-100 hover:text-slate-700',
        count > 0 ? 'min-w-[44px] px-1' : 'w-9',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={count > 0 ? `${count} yorum` : 'Yorum ekle'}
    >
      <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <MessageCircle
          className="h-[22px] w-[22px]"
          strokeWidth={1.5}
          fill="none"
          aria-hidden
        />
        {count > 0 ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-600 px-1 text-[10px] font-bold leading-none text-white tabular-nums ring-2 ring-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center pb-0.5 text-[13px] font-semibold leading-none text-current">
            +
          </span>
        )}
      </span>
    </button>
  );
}

interface Group {
  key: string;
  title: string;
  color: string;
  tasks: Task[];
  user?: User;
}

const TABLE_GROUP_ORDER_STORAGE_KEY = 'geveze.crm.tableGroupOrder.v1';

function loadTableGroupOrder(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TABLE_GROUP_ORDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && Array.isArray(v) && v.every((x): x is string => typeof x === 'string')) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Kayıtlı sırayı uygula; yeni gruplar sonda kalır */
function applyOrderedGroups(groups: Group[], savedKeys: string[] | undefined): Group[] {
  if (!savedKeys?.length) return groups;
  const map = new Map(groups.map((g) => [g.key, g]));
  const seen = new Set<string>();
  const ordered: Group[] = [];
  for (const k of savedKeys) {
    const g = map.get(k);
    if (g) {
      ordered.push(g);
      seen.add(k);
    }
  }
  for (const g of groups) {
    if (!seen.has(g.key)) ordered.push(g);
  }
  return ordered;
}

function SortableGroupContainer({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    type: 'button',
    ...listeners,
    ...attributes,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-4 last:mb-0',
        isDragging && 'relative z-[100] rounded-xl shadow-lg ring-1 ring-[#6161FF]/25'
      )}
    >
      {children(dragHandleProps)}
    </div>
  );
}

type TableChangeConfirm =
  | {
      kind: 'assignee';
      taskId: string;
      taskTitle: string;
      fromLabel: string;
      toLabel: string;
      nextAssigneeId: string | null;
    }
  | {
      kind: 'priority';
      taskId: string;
      taskTitle: string;
      fromLabel: string;
      toLabel: string;
      nextPriority: Task['priority'];
    }
  | {
      kind: 'status';
      taskId: string;
      taskTitle: string;
      fromLabel: string;
      toLabel: string;
      nextStatus: TaskStatus;
    };

interface TableViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  searchQuery?: string;
  tableColumnSchema?: TableColumnSchemaItem[];
  onTableColumnSchemaChange?: (schema: TableColumnSchemaItem[]) => void;
  onTaskCustomFieldChange?: (taskId: string, columnId: string, value: string) => void;
  onRemoveColumnFromTasks?: (columnId: string) => void;
  assigneeFilter?: string;
  onAssigneeFilterChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  sortBy?: 'dueDate' | 'priority' | 'title';
  onSortByChange?: (value: 'dueDate' | 'priority' | 'title') => void;
  sortDir?: 'asc' | 'desc';
  onSortDirChange?: (value: 'asc' | 'desc') => void;
  /** Tabloda tasarımcı değişince onay sonrası çağrılır; `null` = atanmamış */
  onTaskAssigneeCommit?: (taskId: string, assigneeId: string | null) => void;
  onTaskPriorityCommit?: (taskId: string, priority: Task['priority']) => void;
  onTaskStatusCommit?: (taskId: string, status: TaskStatus) => void;
  /** Brief açıklaması yerinde düzenleme; blur veya başka alana geçince kayıt */
  onTaskDescriptionCommit?: (taskId: string, description: string) => void;
  onBulkDeleteTasks?: (taskIds: string[]) => void;
  onBulkReassignTasks?: (taskIds: string[], assigneeId: string) => void;
  onBulkArchiveTasks?: (taskIds: string[]) => void;
  /** Grup altında "+ öğe ekle" satırı; duruma göre gruplamada grup anahtarı varsayılan sütun/durum olarak iletilir */
  onAddTask?: (columnId?: string, dueDate?: Date, assigneeId?: string) => void;
}

export function TableView({
  tasks,
  onTaskClick,
  searchQuery: searchProp,
  tableColumnSchema,
  onTableColumnSchemaChange,
  onTaskCustomFieldChange,
  onRemoveColumnFromTasks,
  assigneeFilter: assigneeFilterProp,
  onAssigneeFilterChange,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  sortBy: sortByProp,
  onSortByChange,
  sortDir: sortDirProp,
  onSortDirChange,
  onTaskAssigneeCommit,
  onTaskPriorityCommit,
  onTaskStatusCommit,
  onTaskDescriptionCommit,
  onBulkDeleteTasks,
  onBulkReassignTasks,
  onBulkArchiveTasks,
  onAddTask,
}: TableViewProps) {
  const schema = useMemo(() => {
    const base = (tableColumnSchema?.length ? tableColumnSchema : DEFAULT_SCHEMA).filter(
      (c) => c.id !== 'comments'
    );
    return base.map((col) => {
      if (col.id !== 'select') return col;
      const w = String(col.width ?? '').trim();
      const m = /^(\d+)px$/i.exec(w);
      const n = m ? parseInt(m[1], 10) : 0;
      if (!Number.isFinite(n) || n < MIN_SELECT_COL_PX) {
        return { ...col, width: `${MIN_SELECT_COL_PX}px` };
      }
      if (n <= 108) {
        return { ...col, width: `${MIN_SELECT_COL_PX}px` };
      }
      return col;
    });
  }, [tableColumnSchema]);
  const [commentDialogTaskId, setCommentDialogTaskId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [briefEditingTaskId, setBriefEditingTaskId] = useState<string | null>(null);
  const [briefDraft, setBriefDraft] = useState('');
  const briefDraftRef = useRef('');
  const search = searchProp ?? '';
  const [localAssigneeFilter, setLocalAssigneeFilter] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState('');
  const [localSortBy, setLocalSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>('asc');
  const isControlled = onAssigneeFilterChange !== undefined;
  const assigneeFilter = isControlled ? (assigneeFilterProp ?? '') : localAssigneeFilter;
  const setAssigneeFilter = isControlled ? (onAssigneeFilterChange ?? (() => {})) : setLocalAssigneeFilter;
  const statusFilter = isControlled ? (statusFilterProp ?? '') : localStatusFilter;
  const setStatusFilter = isControlled ? (onStatusFilterChange ?? (() => {})) : setLocalStatusFilter;
  const sortBy = isControlled ? (sortByProp ?? 'dueDate') : localSortBy;
  const setSortBy = isControlled ? (onSortByChange ?? (() => {})) : setLocalSortBy;
  const sortDir = isControlled ? (sortDirProp ?? 'asc') : localSortDir;
  const setSortDir = isControlled ? (onSortDirChange ?? (() => {})) : setLocalSortDir;
  const [groupBy, setGroupBy] = useState<'time' | 'status' | 'assignee'>('time');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<CustomColumnType>('text');
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [editColumnId, setEditColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState('');
  const [editColumnType, setEditColumnType] = useState<CustomColumnType>('text');
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [tableConfirm, setTableConfirm] = useState<TableChangeConfirm | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [rowMenuOpen, setRowMenuOpen] = useState(false);
  const [rowMenuPos, setRowMenuPos] = useState({ x: 0, y: 0 });
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<
    null | { kind: 'delete' } | { kind: 'archive' } | { kind: 'reassign'; assigneeId: string }
  >(null);
  const [bulkReassignAssigneeId, setBulkReassignAssigneeId] = useState<string>(
    () => users[0]?.id ?? ''
  );
  /** Grup accordion: undefined = açık (varsayılan) */
  const [tableGroupOpen, setTableGroupOpen] = useState<Record<string, boolean>>({});
  const isTableGroupOpen = useCallback(
    (key: string) => tableGroupOpen[key] ?? true,
    [tableGroupOpen]
  );

  useEffect(() => {
    if (selectedTaskIds.length === 0) setRowMenuOpen(false);
  }, [selectedTaskIds.length]);

  const flushBriefEdit = useCallback(() => {
    if (!briefEditingTaskId || !onTaskDescriptionCommit) {
      setBriefEditingTaskId(null);
      return;
    }
    const taskId = briefEditingTaskId;
    const next = briefDraftRef.current.trim();
    setBriefEditingTaskId(null);
    const task = tasks.find((t) => t.id === taskId);
    const prev = (task?.description ?? '').trim();
    if (next !== prev) {
      onTaskDescriptionCommit(taskId, next);
    }
  }, [briefEditingTaskId, onTaskDescriptionCommit, tasks]);

  const sortTasks = useCallback((tasksToSort: Task[]) => {
    const priorityRank: Record<Task['priority'], number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const compare = (a: Task, b: Task) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'tr');
      }
      if (sortBy === 'priority') {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      if (sortBy === 'dueDate') {
        const aTime = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      return 0;
    };
    const next = [...tasksToSort].sort(compare);
    return sortDir === 'desc' ? next.reverse() : next;
  }, [sortBy, sortDir]);

  const filteredTasks = useMemo(() => {
    if (isControlled) return tasks;
    const base = tasks.filter((task) => {
      const matchesSearch = search
        ? task.title.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesAssignee = assigneeFilter
        ? task.assignee?.id === assigneeFilter
        : true;
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      return matchesSearch && matchesAssignee && matchesStatus;
    });
    return sortTasks(base);
  }, [tasks, search, assigneeFilter, statusFilter, sortTasks, isControlled]);

  const bulkActionsEnabled =
    Boolean(onBulkDeleteTasks && onBulkReassignTasks && onBulkArchiveTasks);

  const allFilteredSelected =
    filteredTasks.length > 0 && filteredTasks.every((t) => selectedTaskIds.includes(t.id));
  const someFilteredSelected = filteredTasks.some((t) => selectedTaskIds.includes(t.id));

  const toggleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    if (allFilteredSelected) {
      const ids = new Set(filteredTasks.map((t) => t.id));
      setSelectedTaskIds((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedTaskIds((prev) => {
        const set = new Set(prev);
        filteredTasks.forEach((t) => set.add(t.id));
        return Array.from(set);
      });
    }
  }, [allFilteredSelected, filteredTasks]);

  const runBulkConfirm = useCallback(() => {
    if (!bulkConfirm) return;
    const ids = [...selectedTaskIds];
    if (ids.length === 0) {
      setBulkConfirm(null);
      return;
    }
    if (bulkConfirm.kind === 'delete') onBulkDeleteTasks?.(ids);
    else if (bulkConfirm.kind === 'archive') onBulkArchiveTasks?.(ids);
    else onBulkReassignTasks?.(ids, bulkConfirm.assigneeId);
    setSelectedTaskIds([]);
    setBulkConfirm(null);
  }, [bulkConfirm, selectedTaskIds, onBulkDeleteTasks, onBulkArchiveTasks, onBulkReassignTasks]);

  const groups = useMemo<Group[]>(() => {
    if (groupBy === 'status') {
      const statusGroups: Group[] = [
        { key: 'brief', title: statusLabels.brief, color: '#64748B', tasks: [] },
        { key: 'in-progress', title: statusLabels['in-progress'], color: '#F59E0B', tasks: [] },
        { key: 'review', title: statusLabels.review, color: '#6366F1', tasks: [] },
        { key: 'revision', title: statusLabels.revision, color: '#EF4444', tasks: [] },
        { key: 'done', title: statusLabels.done, color: '#10B981', tasks: [] },
      ];
      const map = new Map(statusGroups.map((g) => [g.key, g]));
      filteredTasks.forEach((task) => {
        map.get(task.status)?.tasks.push(task);
      });
      return statusGroups.filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'assignee') {
      const assigneeGroups: Group[] = users.map((user) => ({
        key: user.id,
        title: user.name,
        color: user.color,
        tasks: [],
        user,
      }));
      const unassigned: Group = {
        key: 'unassigned',
        title: 'Atanmamış',
        color: '#94A3B8',
        tasks: [],
      };
      const map = new Map(assigneeGroups.map((g) => [g.key, g]));
      filteredTasks.forEach((task) => {
        if (task.assignee?.id) {
          map.get(task.assignee.id)?.tasks.push(task);
        } else {
          unassigned.tasks.push(task);
        }
      });
      return [...assigneeGroups.filter((g) => g.tasks.length > 0), unassigned].filter(
        (g) => g.tasks.length > 0
      );
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(weekStart, 1);
    const nextWeekEnd = addWeeks(weekEnd, 1);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    /** Gecikenler üstte ayrı grupta; diğer zaman dilimlerinde tekrarlanmasın */
    const overdueTasks = filteredTasks
      .filter((t) => isTaskOverdue(t, now))
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
    const overdueIds = new Set(overdueTasks.map((t) => t.id));

    const thisWeek = filteredTasks.filter(
      (t) =>
        t.status !== 'done' &&
        !overdueIds.has(t.id) &&
        t.dueDate &&
        isWithinInterval(t.dueDate, { start: weekStart, end: weekEnd })
    );
    const nextWeek = filteredTasks.filter(
      (t) =>
        t.status !== 'done' &&
        !overdueIds.has(t.id) &&
        t.dueDate &&
        isWithinInterval(t.dueDate, { start: nextWeekStart, end: nextWeekEnd })
    );
    const thisMonth = filteredTasks.filter(
      (t) =>
        t.status !== 'done' &&
        !overdueIds.has(t.id) &&
        t.dueDate &&
        isWithinInterval(t.dueDate, { start: monthStart, end: monthEnd }) &&
        !thisWeek.includes(t) &&
        !nextWeek.includes(t)
    );
    const inTimeGroups = new Set([...thisWeek, ...nextWeek, ...thisMonth]);
    const other = filteredTasks.filter(
      (t) =>
        t.status !== 'done' && !overdueIds.has(t.id) && !inTimeGroups.has(t)
    );
    const done = filteredTasks.filter((t) => t.status === 'done');

    const groupsData: Group[] = [
      ...(overdueTasks.length
        ? [{ key: 'overdue', title: 'Geciken', color: '#EF4444', tasks: overdueTasks }]
        : []),
      { key: 'thisWeek', title: 'Bu Hafta', color: '#8B5CF6', tasks: thisWeek },
      { key: 'nextWeek', title: 'Gelecek Hafta', color: '#F97316', tasks: nextWeek },
      ...(thisMonth.length
        ? [{ key: 'thisMonth', title: 'Bu Ay', color: '#0EA5E9', tasks: thisMonth }]
        : []),
      ...(other.length ? [{ key: 'other', title: 'Diğer Görevler', color: '#64748B', tasks: other }] : []),
      { key: 'done', title: 'Tamamlandı', color: '#10B981', tasks: done },
    ];

    return groupsData.filter((g) => g.tasks.length > 0 || g.key === 'done');
  }, [filteredTasks, groupBy]);

  const [tableGroupOrder, setTableGroupOrder] = useState<Record<string, string[]>>(() =>
    loadTableGroupOrder()
  );

  const orderedGroups = useMemo(
    () => applyOrderedGroups(groups, tableGroupOrder[groupBy]),
    [groups, tableGroupOrder, groupBy]
  );

  const tableGroupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );

  const handleTableGroupDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const keys = orderedGroups.map((g) => g.key);
      const oldIndex = keys.indexOf(String(active.id));
      const newIndex = keys.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const nextOrder = arrayMove(keys, oldIndex, newIndex);
      setTableGroupOrder((prev) => {
        const merged = { ...prev, [groupBy]: nextOrder };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(TABLE_GROUP_ORDER_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
        }
        return merged;
      });
    },
    [orderedGroups, groupBy]
  );

  const gridStyle = {
    gridTemplateColumns: [
      ...schema.map((col) => col.width ?? (col.type && col.type !== 'base' ? customColumnWidth : '120px')),
      '50px',
    ].join(' '),
  };

  const commentDialogTask = useMemo(
    () => (commentDialogTaskId ? tasks.find((t) => t.id === commentDialogTaskId) ?? null : null),
    [commentDialogTaskId, tasks]
  );

  const handleCountChange = (taskId: string, count: number) => {
    setCommentCounts((prev) => {
      if (prev[taskId] === count) return prev;
      return { ...prev, [taskId]: count };
    });
  };

  const handleAddColumn = () => {
    const name = newColumnName.trim();
    if (!name || !onTableColumnSchemaChange) return;
    const exportCol = schema.find((c) => c.id === 'export');
    const rest = schema.filter((c) => c.id !== 'export');
    onTableColumnSchemaChange([
      ...rest,
      { id: `custom-${Date.now()}`, label: name, width: customColumnWidth, type: newColumnType },
      ...(exportCol ? [exportCol] : []),
    ]);
    setNewColumnName('');
    setNewColumnType('text');
    setIsAddColumnOpen(false);
  };

  const handleOpenEditColumn = (column: TableColumnSchemaItem) => {
    setEditColumnId(column.id);
    setEditColumnName(column.label);
    setEditColumnType((column.type as CustomColumnType) ?? 'text');
    setIsEditColumnOpen(true);
  };

  const handleSaveEditColumn = () => {
    if (!editColumnId || !onTableColumnSchemaChange) return;
    const name = editColumnName.trim();
    if (!name) return;
    onTableColumnSchemaChange(
      schema.map((col) =>
        col.id === editColumnId
          ? { ...col, label: name, type: (col.type && col.type !== 'base' ? editColumnType : col.type) ?? col.type }
          : col
      )
    );
    setIsEditColumnOpen(false);
  };

  const handleRemoveColumn = (id: string) => {
    if (!onTableColumnSchemaChange) return;
    onTableColumnSchemaChange(schema.filter((col) => col.id !== id));
    onRemoveColumnFromTasks?.(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteColumnId) return;
    handleRemoveColumn(deleteColumnId);
    setDeleteColumnId(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <select
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">Kişi</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Durum</option>
              <option value="brief">Planlandı</option>
              <option value="in-progress">Çalışılıyor</option>
              <option value="review">İncelemede</option>
              <option value="revision">Revizyonda</option>
              <option value="done">Tamamlandı</option>
            </select>
            <select
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            >
              <option value="time">Grupla: Zaman</option>
              <option value="status">Grupla: Durum</option>
              <option value="assignee">Grupla: Kişi</option>
            </select>
            <select
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="dueDate">Sırala: Son teslim</option>
              <option value="priority">Sırala: Öncelik</option>
              <option value="title">Sırala: İsim</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortDir === 'asc' ? 'Artan' : 'Azalan'}
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea
        className={cn(
          'flex-1 min-h-0',
          bulkActionsEnabled && selectedTaskIds.length > 0 && 'pb-28 md:pb-24'
        )}
      >
        {/* Mobile: Card list */}
        <div
          className="md:hidden p-4 space-y-4 pb-8 relative min-h-[120px]"
          onContextMenu={(e) => {
            if (!bulkActionsEnabled || selectedTaskIds.length === 0) return;
            e.preventDefault();
            setRowMenuPos({ x: e.clientX, y: e.clientY });
            setRowMenuOpen(true);
          }}
        >
          {bulkActionsEnabled && filteredTasks.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-1 px-0.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                }}
                onChange={toggleSelectAllFiltered}
              />
              <span className="font-medium">Tümünü seç</span>
              <span className="text-xs text-gray-500 font-normal">(filtrelenen liste)</span>
            </label>
          )}
          {orderedGroups.map((group) => (
            <Collapsible
              key={group.key}
              open={isTableGroupOpen(group.key)}
              onOpenChange={(open) =>
                setTableGroupOpen((prev) => ({ ...prev, [group.key]: open }))
              }
              className="rounded-xl border border-gray-200 bg-gray-50/40 overflow-hidden"
            >
              <CollapsibleTrigger
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#6161FF]/30"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200',
                    isTableGroupOpen(group.key) ? 'rotate-0' : '-rotate-90'
                  )}
                  aria-hidden
                />
                {group.user ? (
                  <Avatar
                    className="w-6 h-6 border-2 border-white shrink-0"
                    style={{ backgroundColor: group.user.color }}
                  >
                    <AvatarFallback className="text-[10px] font-medium text-black">
                      {group.user.initials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span
                    className="inline-flex w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span className="truncate">{group.title}</span>
                <Badge variant="secondary" className="ml-auto shrink-0 text-[11px] font-medium tabular-nums">
                  {group.tasks.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 px-2 pb-3 pt-0">
                  {group.tasks.map((task) => {
                    const timeline =
                      task.dueDate && task.createdAt
                        ? `${format(task.createdAt, 'd MMM', { locale: tr })} - ${format(task.dueDate, 'd MMM', { locale: tr })}`
                        : '--';
                    const mobileSelected = selectedTaskIds.includes(task.id);
                    const mobileCommentCount = commentCounts[task.id] ?? 0;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-sm',
                          mobileSelected && 'bg-blue-50/50 ring-1 ring-[#6161FF]/20'
                        )}
                        style={{ borderLeftWidth: 6, borderLeftColor: group.color }}
                      >
                        {bulkActionsEnabled ? (
                          <button
                            type="button"
                            className={cn(
                              'h-4 w-4 shrink-0 mt-1 rounded-sm border flex items-center justify-center transition-colors',
                              mobileSelected
                                ? 'bg-[#6161FF] border-[#6161FF]'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            )}
                            onClick={() => toggleSelectTask(task.id)}
                            aria-label={`Seç: ${task.title}`}
                            aria-pressed={mobileSelected}
                          >
                            {mobileSelected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                          </button>
                        ) : null}
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <button
                            type="button"
                            onClick={() => onTaskClick(task.id)}
                            className="min-w-0 flex-1 text-left transition-opacity hover:opacity-90"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-900 line-clamp-2">{task.title}</span>
                              <span
                                className="text-[10px] font-semibold text-white shrink-0 rounded-md px-2 py-1"
                                style={solidAccentCellStyle(statusColors[task.status])}
                              >
                                {statusLabels[task.status]}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              {task.assignee && (
                                <span className="flex items-center gap-1">
                                  <Avatar
                                    className="w-4 h-4 border border-white"
                                    style={{ backgroundColor: task.assignee.color }}
                                  >
                                    <AvatarFallback className="text-[8px] font-medium text-black">
                                      {task.assignee.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  {task.assignee.name.split(' ')[0]}
                                </span>
                              )}
                              <span
                                className="rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                                style={solidAccentCellStyle(priorityColors[task.priority])}
                              >
                                {priorityLabels[task.priority]}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  timeline === '--'
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-emerald-100 text-emerald-900'
                                )}
                              >
                                {timeline}
                              </span>
                            </div>
                          </button>
                          <div className="mt-0.5 flex shrink-0 items-start gap-0">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-gray-100 hover:text-slate-700"
                              title="Öneriler"
                              aria-label="Öneriler"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                            </button>
                            <TableCommentButton
                              count={mobileCommentCount}
                              onOpen={() => setCommentDialogTaskId(task.id)}
                              className="!h-8 !w-8 !min-w-8"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {onAddTask ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-[#6161FF]/40 hover:bg-[#6161FF]/5 hover:text-[#6161FF]"
                      onClick={() => {
                        const k = group.key;
                        const isStatusGroup =
                          groupBy === 'status' &&
                          (['brief', 'in-progress', 'review', 'revision', 'done'] as const).includes(
                            k as TaskStatus
                          );
                        onAddTask(isStatusGroup ? (k as TaskStatus) : undefined);
                      }}
                    >
                      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      öğe ekle
                    </button>
                  ) : null}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Desktop: Table */}
        <div
          className="hidden md:block min-w-[1410px] relative"
          onContextMenu={(e) => {
            if (!bulkActionsEnabled || selectedTaskIds.length === 0) return;
            e.preventDefault();
            setRowMenuPos({ x: e.clientX, y: e.clientY });
            setRowMenuOpen(true);
          }}
        >
          <div className="flex items-stretch border-b border-gray-200">
            {bulkActionsEnabled ? (
              <div
                className="flex w-8 shrink-0 items-center justify-center self-stretch border-r border-gray-100 bg-white"
                aria-hidden
              />
            ) : null}
            <div
              className="min-w-0 flex-1 grid items-center gap-x-0 py-2 pl-2 pr-3 text-xs font-semibold text-gray-500 [&>div]:min-w-0 [&>div]:border-r [&>div]:border-gray-200/90 [&>div:last-child]:border-r-0"
              style={gridStyle}
            >
            {schema.map((col) =>
              col.id === 'select' ? (
                <div key={col.id} className="flex items-center justify-center px-0.5">
                  {bulkActionsEnabled ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-sm border-gray-300 accent-[#6161FF]"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      aria-label="Tümünü seç"
                    />
                  ) : (
                    col.label
                  )}
                </div>
              ) : (
                <div key={col.id} className="flex min-w-0 items-center px-1">
                  {col.id === 'item' ? (
                    <>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          onTableColumnSchemaChange &&
                            'cursor-pointer select-none rounded px-0.5 -mx-0.5 hover:bg-gray-100/80 hover:text-gray-700'
                        )}
                        title={
                          onTableColumnSchemaChange
                            ? 'Çift tıklayarak yeniden adlandır'
                            : undefined
                        }
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          if (onTableColumnSchemaChange) handleOpenEditColumn(col);
                        }}
                      >
                        {col.label}
                      </span>
                      <div
                        className="flex h-7 min-w-[76px] shrink-0 items-center justify-end gap-0.5 border-l border-gray-200/90 pl-2 pr-1"
                        aria-hidden
                      >
                        <span className="h-8 w-8 shrink-0 rounded-md bg-transparent" />
                        <span className="h-8 w-8 shrink-0 rounded-md bg-transparent" />
                      </div>
                    </>
                  ) : (
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        onTableColumnSchemaChange &&
                          'cursor-pointer select-none rounded px-0.5 -mx-0.5 hover:bg-gray-100/80 hover:text-gray-700'
                      )}
                      title={
                        onTableColumnSchemaChange ? 'Çift tıklayarak yeniden adlandır' : undefined
                      }
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        if (onTableColumnSchemaChange) handleOpenEditColumn(col);
                      }}
                    >
                      {col.label}
                    </span>
                  )}
                </div>
              )
            )}
            <div className="flex items-center justify-end pl-1">
              <Button size="icon" variant="outline" onClick={() => setIsAddColumnOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            </div>
          </div>

          <DndContext
            sensors={tableGroupSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTableGroupDragEnd}
          >
            <SortableContext
              items={orderedGroups.map((g) => g.key)}
              strategy={verticalListSortingStrategy}
            >
              {orderedGroups.map((group) => (
                <SortableGroupContainer key={group.key} id={group.key}>
                  {(dragHandleProps) => (
                    <Collapsible
                      open={isTableGroupOpen(group.key)}
                      onOpenChange={(open) =>
                        setTableGroupOpen((prev) => ({ ...prev, [group.key]: open }))
                      }
                      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex w-full items-stretch rounded-t-xl bg-gray-50/80 transition-colors hover:bg-gray-100/90 group-data-[state=closed]:rounded-b-xl">
                        <button
                          {...dragHandleProps}
                          className="flex shrink-0 cursor-grab touch-none items-center border-0 bg-transparent px-2 py-3 text-gray-400 outline-none hover:bg-gray-200/40 hover:text-gray-600 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6161FF]/30"
                          aria-label="Grubu sürükleyerek sırayı değiştir"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent py-3 pl-0 pr-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6161FF]/30"
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform duration-200',
                                isTableGroupOpen(group.key) ? 'rotate-0' : '-rotate-90'
                              )}
                              style={{ color: group.color }}
                              aria-hidden
                            />
                            {group.user ? (
                              <Avatar
                                className="w-6 h-6 border-2 border-white shrink-0"
                                style={{ backgroundColor: group.user.color }}
                              >
                                <AvatarFallback className="text-[10px] font-medium text-black">
                                  {group.user.initials}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <span
                                className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                            )}
                            <span className="text-base font-semibold text-gray-900">{group.title}</span>
                            <Badge
                              variant="secondary"
                              className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums"
                            >
                              {group.tasks.length}
                            </Badge>
                          </button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent>
                        <div className="overflow-x-auto rounded-b-xl border-t border-gray-100 bg-white">
                          {group.tasks.map((task) => {
                            const timeline =
                              task.dueDate && task.createdAt
                                ? `${format(task.createdAt, 'd MMM', { locale: tr })} - ${format(task.dueDate, 'd MMM', { locale: tr })}`
                                : '--';
                            const commentCount = commentCounts[task.id] ?? 0;
                            const rowSelected = selectedTaskIds.includes(task.id);

                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  'border-t border-gray-100 group/row relative flex min-h-[44px] items-stretch',
                                  bulkActionsEnabled && rowSelected && 'bg-blue-50/60'
                                )}
                              >
                    {bulkActionsEnabled ? (
                      <div className="z-[3] flex w-8 shrink-0 items-center justify-center self-stretch border-r border-gray-100/80">
                        <button
                          type="button"
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200/90 bg-gray-100 text-gray-700 transition-[opacity,colors] hover:bg-gray-200/90 focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6161FF]/40',
                            rowSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100'
                          )}
                          aria-label="Satır eylemleri"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowMenuPos({ x: e.clientX, y: e.clientY });
                            setRowMenuOpen(true);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    <div className="relative min-w-0 min-h-[44px] flex-1 self-stretch">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-1.5"
                        style={{ backgroundColor: group.color }}
                      />
                      <div
                        className="relative grid min-h-[44px] items-center gap-x-0 py-2 pl-2 pr-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 [&>div]:min-w-0 [&>div]:border-r [&>div]:border-gray-200/90 [&>div:last-child]:border-r-0"
                        style={gridStyle}
                        onDoubleClick={() => onTaskClick(task.id)}
                      >
                      {schema.map((col) => {
                        if (col.id === 'select') {
                          return (
                            <div
                              key={col.id}
                              className="z-[2] flex min-w-0 w-full max-w-full items-center justify-center px-0.5"
                            >
                              {bulkActionsEnabled ? (
                                <button
                                  type="button"
                                  className={cn(
                                    'h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors',
                                    rowSelected
                                      ? 'bg-[#6161FF] border-[#6161FF]'
                                      : 'border-gray-300 bg-white hover:border-gray-400'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectTask(task.id);
                                  }}
                                  aria-label={`Seç: ${task.title}`}
                                  aria-pressed={rowSelected}
                                >
                                  {rowSelected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                                </button>
                              ) : (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 opacity-40"
                                  disabled
                                  aria-hidden
                                />
                              )}
                            </div>
                          );
                        }
                        if (col.id === 'item') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] min-w-0 max-w-full items-center gap-2 overflow-hidden pl-1"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                                {task.title}
                              </span>
                              <div className="flex shrink-0 items-center gap-0 border-l border-gray-200/90 pl-2 pr-0.5">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6161FF]/30"
                                  title="Öneriler"
                                  aria-label="Öneriler"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                                </button>
                                <TableCommentButton
                                  count={commentCount}
                                  onOpen={() => setCommentDialogTaskId(task.id)}
                                  className="!h-8 !w-8 !min-w-8"
                                />
                              </div>
                            </div>
                          );
                        }
                        if (col.id === 'assignee') {
                          if (!onTaskAssigneeCommit) {
                            return (
                              <div
                                key={col.id}
                                className="flex min-h-[44px] items-center justify-center px-0.5"
                              >
                                {task.assignee ? (
                                  <Avatar
                                    className="h-7 w-7 border-2 border-white"
                                    style={{ backgroundColor: task.assignee.color }}
                                    title={task.assignee.name}
                                  >
                                    <AvatarFallback className="text-[10px] font-medium text-black">
                                      {task.assignee.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>
                            );
                          }
                          const requestAssigneeChange = (nextId: string | null) => {
                            const curId = task.assignee?.id ?? null;
                            if (curId === nextId) return;
                            const fromLabel = task.assignee?.name ?? 'Atanmamış';
                            const toUser = nextId ? users.find((u) => u.id === nextId) : undefined;
                            const toLabel = toUser?.name ?? 'Atanmamış';
                            setTableConfirm({
                              kind: 'assignee',
                              taskId: task.id,
                              taskTitle: task.title,
                              fromLabel,
                              toLabel,
                              nextAssigneeId: nextId,
                            });
                          };
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-100/80"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title={task.assignee?.name}
                                  >
                                    {task.assignee ? (
                                      <Avatar
                                        className="h-7 w-7 border-2 border-white shrink-0 cursor-pointer hover:ring-2 hover:ring-[#6161FF]/30"
                                        style={{ backgroundColor: task.assignee.color }}
                                      >
                                        <AvatarFallback className="text-[10px] font-medium text-black">
                                          {task.assignee.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-300 shrink-0 hover:border-[#6161FF]/50 hover:bg-[#6161FF]/5">
                                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                                      </div>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-52 p-0"
                                  align="start"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="p-2 border-b border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">Tasarımcı</span>
                                  </div>
                                  <div className="p-1 max-h-48 overflow-y-auto">
                                    <button
                                      type="button"
                                      className={cn(
                                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                                        !task.assignee ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                                      )}
                                      onClick={() => requestAssigneeChange(null)}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                        <UserIcon className="h-3 w-3 text-gray-500" />
                                      </div>
                                      Atanmamış
                                    </button>
                                    {users.map((u) => (
                                      <button
                                        key={u.id}
                                        type="button"
                                        className={cn(
                                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                                          task.assignee?.id === u.id
                                            ? 'bg-[#6161FF]/10 text-[#6161FF]'
                                            : 'hover:bg-gray-100'
                                        )}
                                        onClick={() => requestAssigneeChange(u.id)}
                                      >
                                        <Avatar
                                          className="w-6 h-6 shrink-0"
                                          style={{ backgroundColor: u.color }}
                                        >
                                          <AvatarFallback className="text-[10px] font-medium text-black">
                                            {u.initials}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{u.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        }
                        if (col.id === 'priority') {
                          if (!onTaskPriorityCommit) {
                            return (
                              <div
                                key={col.id}
                                className="flex min-h-[44px] w-full self-stretch items-stretch px-0 py-0.5"
                              >
                                <div
                                  className="flex min-h-[38px] w-full flex-1 items-center justify-center rounded-sm px-2 py-1.5 text-center text-[11px] font-semibold leading-tight tracking-tight"
                                  style={solidAccentCellStyle(priorityColors[task.priority])}
                                >
                                  {priorityLabels[task.priority]}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] w-full self-stretch items-stretch py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex min-h-[38px] w-full flex-1 cursor-pointer items-center justify-center rounded-sm border-0 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight tracking-tight shadow-none hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6161FF]/40"
                                    style={solidAccentCellStyle(priorityColors[task.priority])}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    {priorityLabels[task.priority]}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-44 p-0"
                                  align="start"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="p-2 border-b border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">Öncelik</span>
                                  </div>
                                  <div className="p-1 flex flex-col gap-0.5">
                                    {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        className={cn(
                                          'w-full text-left px-2 py-2 rounded-md text-xs font-medium transition-colors',
                                          task.priority === p
                                            ? 'bg-[#6161FF]/10 ring-1 ring-[#6161FF]'
                                            : 'hover:bg-gray-100'
                                        )}
                                        style={{ color: priorityColors[p] }}
                                        onClick={() => {
                                          if (task.priority === p) return;
                                          setTableConfirm({
                                            kind: 'priority',
                                            taskId: task.id,
                                            taskTitle: task.title,
                                            fromLabel: priorityLabels[task.priority],
                                            toLabel: priorityLabels[p],
                                            nextPriority: p,
                                          });
                                        }}
                                      >
                                        {priorityLabels[p]}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        }
                        if (col.id === 'status') {
                          if (!onTaskStatusCommit) {
                            return (
                              <div
                                key={col.id}
                                className="flex min-h-[44px] w-full self-stretch items-stretch px-0 py-0.5"
                              >
                                <div
                                  className="flex min-h-[38px] w-full flex-1 items-center justify-center rounded-sm px-2 py-1.5 text-center text-[11px] font-semibold leading-tight tracking-tight"
                                  style={solidAccentCellStyle(statusColors[task.status])}
                                >
                                  {statusLabels[task.status]}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] w-full self-stretch items-stretch py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex min-h-[38px] w-full flex-1 cursor-pointer items-center justify-center rounded-sm border-0 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight tracking-tight shadow-none hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6161FF]/40"
                                    style={solidAccentCellStyle(statusColors[task.status])}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    {statusLabels[task.status]}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-52 p-0"
                                  align="start"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="p-2 border-b border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">Durum</span>
                                  </div>
                                  <div className="p-1 max-h-44 overflow-y-auto">
                                    {initialColumns.map((colDef) => {
                                      const st = colDef.id as TaskStatus;
                                      return (
                                        <button
                                          key={colDef.id}
                                          type="button"
                                          className={cn(
                                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                                            task.status === st
                                              ? 'bg-[#6161FF]/10 text-[#6161FF]'
                                              : 'hover:bg-gray-100'
                                          )}
                                          onClick={() => {
                                            if (task.status === st) return;
                                            setTableConfirm({
                                              kind: 'status',
                                              taskId: task.id,
                                              taskTitle: task.title,
                                              fromLabel: statusLabels[task.status],
                                              toLabel: statusLabels[st],
                                              nextStatus: st,
                                            });
                                          }}
                                        >
                                          <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: colDef.color }}
                                          />
                                          {statusLabels[st]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        }
                        if (col.id === 'timeline') {
                          const timelineEmpty = timeline === '--';
                          return (
                            <div key={col.id} className="flex min-h-[44px] items-center justify-center px-1">
                              <span
                                className={cn(
                                  'inline-flex w-full max-w-[160px] justify-center rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap',
                                  timelineEmpty
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-emerald-100 text-emerald-900'
                                )}
                              >
                                {timeline}
                              </span>
                            </div>
                          );
                        }
                        if (col.id === 'due') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center justify-center px-1 text-center text-xs tabular-nums text-gray-600"
                            >
                              {task.dueDate ? format(task.dueDate, 'd MMM', { locale: tr }) : '—'}
                            </div>
                          );
                        }
                        if (col.id === 'brief') {
                          const editingBrief =
                            briefEditingTaskId === task.id && Boolean(onTaskDescriptionCommit);
                          if (!onTaskDescriptionCommit) {
                            return (
                              <div
                                key={col.id}
                                className="flex min-h-[44px] items-center px-1 text-xs leading-snug text-gray-500"
                              >
                                <span className="line-clamp-2 w-full text-left">
                                  {task.description || '—'}
                                </span>
                              </div>
                            );
                          }
                          if (editingBrief) {
                            return (
                              <div
                                key={col.id}
                                className="flex min-h-[44px] items-stretch px-1 py-0.5"
                                onDoubleClick={(e) => e.stopPropagation()}
                              >
                                <Textarea
                                  autoFocus
                                  rows={2}
                                  value={briefDraft}
                                  onChange={(e) => {
                                    briefDraftRef.current = e.target.value;
                                    setBriefDraft(e.target.value);
                                  }}
                                  onBlur={flushBriefEdit}
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      const t = tasks.find((x) => x.id === task.id);
                                      const d = t?.description ?? '';
                                      briefDraftRef.current = d;
                                      setBriefDraft(d);
                                      setBriefEditingTaskId(null);
                                    }
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                      e.preventDefault();
                                      (e.target as HTMLTextAreaElement).blur();
                                    }
                                  }}
                                  className="min-h-[40px] w-full resize-y rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs leading-snug text-gray-800 shadow-sm focus-visible:ring-2 focus-visible:ring-[#6161FF]/30"
                                  aria-label="Brief açıklaması"
                                />
                              </div>
                            );
                          }
                          return (
                            <div
                              key={col.id}
                              role="button"
                              tabIndex={0}
                              className="flex min-h-[44px] cursor-text items-center rounded-md px-1 text-xs leading-snug text-gray-500 transition-colors hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                const d = task.description ?? '';
                                briefDraftRef.current = d;
                                setBriefDraft(d);
                                setBriefEditingTaskId(task.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  const d = task.description ?? '';
                                  briefDraftRef.current = d;
                                  setBriefDraft(d);
                                  setBriefEditingTaskId(task.id);
                                }
                              }}
                              onDoubleClick={(e) => e.stopPropagation()}
                            >
                              <span className="line-clamp-2 w-full text-left">
                                {task.description?.trim() ? task.description : '—'}
                              </span>
                            </div>
                          );
                        }
                        if (col.id === 'link') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center justify-center gap-1 px-1 text-center text-xs text-[#6161FF]"
                            >
                              <Link2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">{col.label}</span>
                            </div>
                          );
                        }
                        if (col.id === 'doc') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center justify-center gap-1 px-1 text-center text-xs text-gray-500"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">{col.label}</span>
                            </div>
                          );
                        }
                        if (col.id === 'export') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center justify-center gap-1 px-1 text-center text-xs text-gray-500"
                            >
                              <Download className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">{col.label}</span>
                            </div>
                          );
                        }
                        const value = task.customFields?.[col.id] ?? '';
                        const colType = (col.type as CustomColumnType) ?? 'text';
                        if (colType === 'status') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center px-0.5 text-xs text-gray-600"
                            >
                              <select
                                className="h-8 w-full rounded-lg border border-gray-200 px-2 text-xs"
                                value={value}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  onTaskCustomFieldChange?.(task.id, col.id, e.target.value)
                                }
                              >
                                <option value="">Seç</option>
                                <option value="brief">Planlandı</option>
                                <option value="in-progress">Çalışılıyor</option>
                                <option value="review">İncelemede</option>
                                <option value="revision">Revizyonda</option>
                                <option value="done">Tamamlandı</option>
                              </select>
                            </div>
                          );
                        }
                        if (colType === 'priority') {
                          return (
                            <div
                              key={col.id}
                              className="flex min-h-[44px] items-center px-0.5 text-xs text-gray-600"
                            >
                              <select
                                className="h-8 w-full rounded-lg border border-gray-200 px-2 text-xs"
                                value={value}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  onTaskCustomFieldChange?.(task.id, col.id, e.target.value)
                                }
                              >
                                <option value="">Seç</option>
                                <option value="low">{priorityLabels.low}</option>
                                <option value="medium">{priorityLabels.medium}</option>
                                <option value="high">{priorityLabels.high}</option>
                                <option value="urgent">{priorityLabels.urgent}</option>
                              </select>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={col.id}
                            className="flex min-h-[44px] items-center px-0.5 text-xs text-gray-600"
                          >
                            <Input
                              value={value}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                onTaskCustomFieldChange?.(task.id, col.id, e.target.value)
                              }
                              placeholder={colType === 'link' ? 'https://' : '—'}
                              type={
                                colType === 'number'
                                  ? 'number'
                                  : colType === 'date'
                                  ? 'date'
                                  : colType === 'link'
                                  ? 'url'
                                  : 'text'
                              }
                              className="h-8"
                            />
                          </div>
                        );
                      })}
                      <div />
                    </div>
                    </div>
                  </div>
                );
              })}
              {onAddTask ? (
                <div className="flex min-h-[42px] items-stretch border-t border-gray-100 bg-white transition-colors hover:bg-gray-50/70">
                  {bulkActionsEnabled ? (
                    <div className="w-8 shrink-0 border-r border-gray-100/80" aria-hidden />
                  ) : null}
                  <div className="relative flex min-w-0 flex-1 items-center py-2 pl-2 pr-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-gray-100 hover:text-[#6161FF]"
                      onClick={() => {
                        const k = group.key;
                        const isStatusGroup =
                          groupBy === 'status' &&
                          (['brief', 'in-progress', 'review', 'revision', 'done'] as const).includes(
                            k as TaskStatus
                          );
                        onAddTask(isStatusGroup ? (k as TaskStatus) : undefined);
                      }}
                    >
                      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      öğe ekle
                    </button>
                  </div>
                </div>
              ) : null}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </SortableGroupContainer>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {bulkActionsEnabled && (
          <>
            <Popover
              open={rowMenuOpen}
              onOpenChange={setRowMenuOpen}
              modal={false}
            >
              <PopoverAnchor asChild>
                <div
                  aria-hidden
                  className="fixed z-40 h-px w-px pointer-events-none"
                  style={{ left: rowMenuPos.x, top: rowMenuPos.y }}
                />
              </PopoverAnchor>
              <PopoverContent
                className="w-56 p-1"
                align="start"
                side="right"
                sideOffset={4}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start gap-2 px-2 font-normal"
                    onClick={() => {
                      setRowMenuOpen(false);
                      setBulkReassignAssigneeId((id) => id || users[0]?.id || '');
                      setBulkReassignOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    {selectedTaskIds.length === 1 ? 'Görevi devret' : 'Görevleri devret'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start gap-2 px-2 font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setRowMenuOpen(false);
                      setBulkConfirm({ kind: 'delete' });
                    }}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    {selectedTaskIds.length === 1 ? 'Görevi sil' : 'Görevleri sil'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-start gap-2 px-2 font-normal"
                    onClick={() => {
                      setRowMenuOpen(false);
                      setBulkConfirm({ kind: 'archive' });
                    }}
                  >
                    <Archive className="h-4 w-4 shrink-0" />
                    {selectedTaskIds.length === 1 ? 'Görevi arşivle' : 'Görevleri arşivle'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Dialog
              open={bulkReassignOpen}
              onOpenChange={(open) => {
                setBulkReassignOpen(open);
              }}
            >
              <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>
                    {selectedTaskIds.length === 1 ? 'Görevi devret' : 'Görevleri devret'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    {selectedTaskIds.length} görev seçili. Yeni tasarımcıyı seçin; onay ekranında işlemi
                    tamamlayın.
                  </p>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                    value={bulkReassignAssigneeId}
                    onChange={(e) => setBulkReassignAssigneeId(e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setBulkReassignOpen(false)}>
                    Vazgeç
                  </Button>
                  <Button
                    disabled={!bulkReassignAssigneeId}
                    onClick={() => {
                      if (!bulkReassignAssigneeId) return;
                      setBulkReassignOpen(false);
                      setBulkConfirm({ kind: 'reassign', assigneeId: bulkReassignAssigneeId });
                    }}
                  >
                    Devam
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={bulkConfirm !== null}
              onOpenChange={(open) => {
                if (!open) setBulkConfirm(null);
              }}
            >
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {bulkConfirm?.kind === 'delete'
                      ? selectedTaskIds.length === 1
                        ? 'Görevi sil'
                        : 'Görevleri sil'
                      : bulkConfirm?.kind === 'archive'
                        ? selectedTaskIds.length === 1
                          ? 'Görevi arşivle'
                          : 'Görevleri arşivle'
                        : 'Görevleri devret'}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {bulkConfirm?.kind === 'delete' && (
                        <p>
                          Seçili {selectedTaskIds.length} görev kalıcı olarak silinecek. Bu işlem geri
                          alınamaz. Onaylıyor musunuz?
                        </p>
                      )}
                      {bulkConfirm?.kind === 'archive' && (
                        <p>
                          Seçili {selectedTaskIds.length} görev arşivlenecek ve ana listeden kaldırılacak.
                          Onaylıyor musunuz?
                        </p>
                      )}
                      {bulkConfirm?.kind === 'reassign' && bulkConfirm && (
                        <p>
                          Seçili {selectedTaskIds.length} görev{' '}
                          <span className="font-medium text-foreground">
                            {users.find((u) => u.id === bulkConfirm.assigneeId)?.name ?? '—'}
                          </span>{' '}
                          kullanıcısına devredilecek. Onaylıyor musunuz?
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction
                    className={
                      bulkConfirm?.kind === 'delete'
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                        : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      runBulkConfirm();
                    }}
                  >
                    Onayla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {bulkActionsEnabled && selectedTaskIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex max-w-[min(100vw-1.5rem,520px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)]"
          role="toolbar"
          aria-label="Seçili görev eylemleri"
        >
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3 pl-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6161FF] text-xs font-bold text-white tabular-nums">
              {selectedTaskIds.length}
            </div>
            <span className="text-sm font-semibold text-gray-800">Seçilen</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 font-normal text-gray-700"
              onClick={() => {
                setBulkReassignAssigneeId((id) => id || users[0]?.id || '');
                setBulkReassignOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Devret</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 font-normal text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setBulkConfirm({ kind: 'delete' })}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sil</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 font-normal text-gray-700"
              onClick={() => setBulkConfirm({ kind: 'archive' })}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Arşivle</span>
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-gray-400 hover:text-gray-700"
            onClick={() => setSelectedTaskIds([])}
            aria-label="Seçimi temizle"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={commentDialogTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setCommentDialogTaskId(null);
        }}
      >
        <DialogContent
          className="max-w-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Yorumlar</DialogTitle>
            {commentDialogTask && (
              <div className="text-sm text-gray-500">{commentDialogTask.title}</div>
            )}
          </DialogHeader>
          {commentDialogTask && (
            <TaskCommentsPanel
              task={commentDialogTask}
              onCountChange={(count) => handleCountChange(commentDialogTask.id, count)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={tableConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setTableConfirm(null);
        }}
      >
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {tableConfirm?.kind === 'assignee'
                ? 'Tasarımcı değişikliği'
                : tableConfirm?.kind === 'priority'
                  ? 'Öncelik değişikliği'
                  : tableConfirm?.kind === 'status'
                    ? 'Durum değişikliği'
                    : 'Değişiklik onayı'}
            </DialogTitle>
          </DialogHeader>
          {tableConfirm && (
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">{tableConfirm.taskTitle}</span> görevinde{' '}
                {tableConfirm.kind === 'assignee'
                  ? 'tasarımcı'
                  : tableConfirm.kind === 'priority'
                    ? 'öncelik'
                    : 'durum'}{' '}
                şöyle değişecek:
              </p>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-900">
                {tableConfirm.fromLabel} → {tableConfirm.toLabel}
              </p>
              <p>Bu değişikliği onaylıyor musunuz?</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTableConfirm(null)}>
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                if (!tableConfirm) return;
                if (tableConfirm.kind === 'assignee') {
                  onTaskAssigneeCommit?.(tableConfirm.taskId, tableConfirm.nextAssigneeId);
                } else if (tableConfirm.kind === 'priority') {
                  onTaskPriorityCommit?.(tableConfirm.taskId, tableConfirm.nextPriority);
                } else if (tableConfirm.kind === 'status') {
                  onTaskStatusCommit?.(tableConfirm.taskId, tableConfirm.nextStatus);
                }
                setTableConfirm(null);
              }}
            >
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Sütun Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Sütun adı</div>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Örn: Müşteri"
              />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Tür</div>
              <select
                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as CustomColumnType)}
              >
                <option value="text">Metin</option>
                <option value="number">Sayı</option>
                <option value="date">Tarih</option>
                <option value="link">Bağlantı</option>
                <option value="priority">Öncelik</option>
                <option value="status">Durum</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddColumnOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditColumnOpen} onOpenChange={setIsEditColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sütunu Düzenle</DialogTitle>
          </DialogHeader>
          {(() => {
            const editingCol = editColumnId
              ? schema.find((c) => c.id === editColumnId)
              : undefined;
            const editingCustomColumn =
              Boolean(editingCol?.type && editingCol.type !== 'base');
            return (
              <>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-sm font-medium text-gray-700">Sütun adı</div>
                    <Input
                      value={editColumnName}
                      onChange={(e) => setEditColumnName(e.target.value)}
                      placeholder="Örn: Müşteri"
                    />
                  </div>
                  {editingCustomColumn && (
                    <div>
                      <div className="mb-1 text-sm font-medium text-gray-700">Tür</div>
                      <select
                        className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                        value={editColumnType}
                        onChange={(e) => setEditColumnType(e.target.value as CustomColumnType)}
                      >
                        <option value="text">Metin</option>
                        <option value="number">Sayı</option>
                        <option value="date">Tarih</option>
                        <option value="link">Bağlantı</option>
                        <option value="priority">Öncelik</option>
                        <option value="status">Durum</option>
                      </select>
                    </div>
                  )}
                </div>
                <DialogFooter
                  className={cn(
                    'flex items-center gap-2',
                    editingCustomColumn ? 'justify-between' : 'justify-end'
                  )}
                >
                  {editingCustomColumn && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        if (editColumnId) setDeleteColumnId(editColumnId);
                        setIsEditColumnOpen(false);
                      }}
                    >
                      Sil
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsEditColumnOpen(false)}>
                      Vazgeç
                    </Button>
                    <Button onClick={handleSaveEditColumn} disabled={!editColumnName.trim()}>
                      Kaydet
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteColumnId} onOpenChange={() => setDeleteColumnId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sütun Silinsin mi?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-500">
            Bu sütuna ait tüm değerler silinecek. Bu işlem geri alınamaz.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteColumnId(null)}>
              Vazgeç
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
