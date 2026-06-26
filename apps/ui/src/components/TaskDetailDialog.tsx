import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LabelChip } from '@/components/ui/LabelChip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCommentsPanel } from '@/components/TaskCommentsPanel';
import { PRIORITY_COLORS as priorityColors, PRIORITY_LABELS as priorityLabels, STATUS_LABELS as statusLabels } from '@/lib/constants';
import { useUsers } from '@/contexts/UsersContext';
import type { CustomColumnType, Priority, TableColumnSchemaItem, Task, TaskStatus, TaskAttachment } from '@/types';
import { DocumentUploadDialog } from '@/components/DocumentUploadDialog';
import {
  Archive,
  Calendar,
  FileText,
  History,
  MessageSquare,
  Trash2,
  Undo2,
  Upload,
  X,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getTaskProgress, getTaskProgressGradient } from '@/lib/taskProgress';
import { cn } from '@/lib/utils';

interface TaskEditPayload {
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

interface TaskDetailDialogProps {
  open: boolean;
  task: Task | null;
  portfolioOptions: Array<{ id: string; name: string }>;
  tableColumnSchema?: TableColumnSchemaItem[];
  onClose: () => void;
  onSave: (taskId: string, payload: TaskEditPayload) => void;
  onDelete: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onRestoreFromArchive?: (taskId: string) => void;
  onAddAttachment?: (taskId: string, attachment: TaskAttachment) => void;
  onRemoveAttachment?: (taskId: string, attachmentId: string) => void;
  onTaskUpdate?: (updated: Task) => void;
  availableTags?: string[];
  tagColorMap?: Record<string, string>;
  onAddTag?: (name: string, color?: string) => void;
  tagServiceMap?: Record<string, string>;
  onSetTagService?: (tag: string, serviceType: string | null) => void;
  /** Tablo görünümünden açıldığında sağdan kayan panel */
  presentation?: 'dialog' | 'sheet';
}

type TaskDetailTab = 'updates' | 'files' | 'history';

export type TaskDetailPresentation = 'dialog' | 'sheet';

const createDraft = (task: Task) => ({
  title: task.title,
  description: task.description ?? '',
  status: task.status,
  priority: task.priority,
  assigneeId: task.assignee?.id ?? '',
  portfolioCompanyId: task.portfolioCompanyId ?? '',
  startDate: task.createdAt ? format(task.createdAt, 'yyyy-MM-dd') : '',
  dueDate: task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '',
  progress: task.progress,
  tagsInput: task.tags.join(', '),
});

const DIALOG_MIN_WIDTH = 920;
const DIALOG_MIN_HEIGHT = 620;
const DIALOG_MAX_WIDTH = 1320;
const DIALOG_MAX_HEIGHT = 980;
const LEFT_PANEL_MIN_WIDTH = 340;
const RIGHT_PANEL_MIN_WIDTH = 360;
const SPLITTER_WIDTH = 8;

type ResizeMode = 'right' | 'bottom' | 'corner' | 'split';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getViewportLimits = () => {
  if (typeof window === 'undefined') {
    return {
      maxWidth: DIALOG_MAX_WIDTH,
      maxHeight: DIALOG_MAX_HEIGHT,
    };
  }

  return {
    maxWidth: Math.max(DIALOG_MIN_WIDTH, window.innerWidth - 24),
    maxHeight: Math.max(DIALOG_MIN_HEIGHT, window.innerHeight - 24),
  };
};

const getInitialDialogSize = () => {
  const { maxWidth, maxHeight } = getViewportLimits();
  return {
    width: Math.min(DIALOG_MAX_WIDTH, maxWidth),
    height: Math.min(DIALOG_MAX_HEIGHT, maxHeight),
  };
};

interface TaskDetailDialogContentProps {
  open: boolean;
  task: Task;
  portfolioOptions: Array<{ id: string; name: string }>;
  tableColumnSchema?: TableColumnSchemaItem[];
  onClose: () => void;
  onSave: (taskId: string, payload: TaskEditPayload) => void;
  onDelete: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onRestoreFromArchive?: (taskId: string) => void;
  onAddAttachment?: (taskId: string, attachment: TaskAttachment) => void;
  onRemoveAttachment?: (taskId: string, attachmentId: string) => void;
  onTaskUpdate?: (updated: Task) => void;
  availableTags?: string[];
  tagColorMap?: Record<string, string>;
  onAddTag?: (name: string, color?: string) => void;
  tagServiceMap?: Record<string, string>;
  onSetTagService?: (tag: string, serviceType: string | null) => void;
  presentation?: TaskDetailPresentation;
}

const FALLBACK_TAGS = [
  'Web Site', 'Sosyal Medya', 'Tasarım', 'Post', 'Story',
  'Reels', 'Katalog', 'Tanıtım Filmi', '3D', 'Motion Graphic',
];

function TaskDetailDialogContent({
  open,
  task,
  portfolioOptions,
  tableColumnSchema = [],
  onClose,
  onSave,
  onDelete,
  onArchive,
  onRestoreFromArchive,
  onAddAttachment,
  onRemoveAttachment,
  onTaskUpdate,
  availableTags: availableTagsProp = [],
  tagColorMap = {},
  onAddTag,
  tagServiceMap: _tagServiceMap,
  onSetTagService: _onSetTagService,
  presentation = 'dialog',
}: TaskDetailDialogContentProps) {
  const users = useUsers();
  const initialDraft = createDraft(task);
  const baseTags = availableTagsProp.length > 0 ? availableTagsProp : FALLBACK_TAGS;
  const [activeTab, setActiveTab] = useState<TaskDetailTab>('updates');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const customCols = tableColumnSchema.filter((c) => c.type && c.type !== 'base');
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [status, setStatus] = useState<TaskStatus>(initialDraft.status);
  const [priority, setPriority] = useState<Priority>(initialDraft.priority);
  const [assigneeId, setAssigneeId] = useState(initialDraft.assigneeId);
  const [portfolioCompanyId, setPortfolioCompanyId] = useState(initialDraft.portfolioCompanyId);
  const [startDate, setStartDate] = useState(initialDraft.startDate);
  const [dueDate, setDueDate] = useState(initialDraft.dueDate);
  const [progress, setProgress] = useState(() =>
    getTaskProgress({
      status: initialDraft.status,
      priority: initialDraft.priority,
      progress: initialDraft.progress,
    })
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(() => task.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>(() => ({ ...task.customFields }));
  const [dialogSize, setDialogSize] = useState(getInitialDialogSize);
  const [leftPaneWidth, setLeftPaneWidth] = useState(430);
  const resizeRafRef = useRef<number | null>(null);
  const pendingResizeRef = useRef<{
    width: number;
    height: number;
    leftPaneWidth: number;
  } | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  );
  const maxLeftPaneWidth = useMemo(
    () =>
      Math.max(
        LEFT_PANEL_MIN_WIDTH,
        dialogSize.width - RIGHT_PANEL_MIN_WIDTH - SPLITTER_WIDTH
      ),
    [dialogSize.width]
  );
  const clampedLeftPaneWidth = clamp(leftPaneWidth, LEFT_PANEL_MIN_WIDTH, maxLeftPaneWidth);

  const assignee = useMemo(
    () => users.find((user) => user.id === assigneeId),
    [assigneeId]
  );
  const selectedPortfolio = useMemo(
    () => portfolioOptions.find((company) => company.id === portfolioCompanyId),
    [portfolioCompanyId, portfolioOptions]
  );
  const progressStartDate = useMemo(() => (startDate ? new Date(`${startDate}T00:00:00`) : undefined), [startDate]);
  const progressDueDate = useMemo(() => (dueDate ? new Date(`${dueDate}T00:00:00`) : undefined), [dueDate]);
  const progressSource = useMemo(
    () => ({
      status,
      priority,
      progress,
    }),
    [status, priority, progress]
  );
  const computedProgress = getTaskProgress(progressSource);
  const progressGradient = getTaskProgressGradient(progressSource);

  useEffect(() => {
    if (typeof window === 'undefined' || !open) return;

    const syncViewport = () => {
      const { maxWidth, maxHeight } = getViewportLimits();
      if (presentation === 'sheet') {
        const w = Math.min(DIALOG_MAX_WIDTH, maxWidth);
        const h = Math.min(DIALOG_MAX_HEIGHT, window.innerHeight);
        setDialogSize({ width: w, height: h });
      } else {
        setDialogSize((prev) => ({
          width: clamp(prev.width, DIALOG_MIN_WIDTH, maxWidth),
          height: clamp(prev.height, DIALOG_MIN_HEIGHT, maxHeight),
        }));
      }
      setIsDesktopLayout(window.innerWidth >= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, [open, presentation]);

  const handleStatusChange = (nextStatus: TaskStatus) => {
    setStatus(nextStatus);
    setProgress((prev) => getTaskProgress({ status: nextStatus, priority, progress: prev }));
  };

  const handlePriorityChange = (nextPriority: Priority) => {
    setPriority(nextPriority);
    setProgress((prev) => getTaskProgress({ status, priority: nextPriority, progress: prev }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addNewTag = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      onAddTag?.(trimmed);
    }
    setNewTag('');
  };

  const availableTags = [...baseTags, ...selectedTags.filter((s) => !baseTags.includes(s))];

  useEffect(() => {
    setCustomFields({ ...task.customFields });
  }, [task.id, task.customFields]);

  useEffect(() => {
    setSelectedTags(task.tags ?? []);
  }, [task.id, task.tags]);

  useEffect(() => {
    return () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, []);

  const scheduleResizeStateUpdate = (
    nextWidth: number,
    nextHeight: number,
    nextLeftPaneWidth: number
  ) => {
    pendingResizeRef.current = {
      width: nextWidth,
      height: nextHeight,
      leftPaneWidth: nextLeftPaneWidth,
    };

    if (resizeRafRef.current !== null) return;

    resizeRafRef.current = window.requestAnimationFrame(() => {
      resizeRafRef.current = null;
      const next = pendingResizeRef.current;
      if (!next) return;

      setDialogSize((prev) =>
        prev.width === next.width && prev.height === next.height
          ? prev
          : { width: next.width, height: next.height }
      );
      setLeftPaneWidth((prev) => (prev === next.leftPaneWidth ? prev : next.leftPaneWidth));
    });
  };

  const handleResizeStart = (mode: ResizeMode) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = dialogSize.width;
    const startHeight = dialogSize.height;
    const startLeftPaneWidth = clampedLeftPaneWidth;

    const cursor =
      mode === 'right' || mode === 'split'
        ? 'col-resize'
        : mode === 'bottom'
          ? 'row-resize'
          : 'nwse-resize';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (mode === 'split') {
        scheduleResizeStateUpdate(
          dialogSize.width,
          dialogSize.height,
          clamp(startLeftPaneWidth + dx, LEFT_PANEL_MIN_WIDTH, maxLeftPaneWidth)
        );
        return;
      }

      const { maxWidth, maxHeight } = getViewportLimits();
      const nextWidth =
        mode === 'right' || mode === 'corner'
          ? clamp(startWidth + dx, DIALOG_MIN_WIDTH, maxWidth)
          : startWidth;
      const nextHeight =
        mode === 'bottom' || mode === 'corner'
          ? clamp(startHeight + dy, DIALOG_MIN_HEIGHT, maxHeight)
          : startHeight;

      const maxLeft = Math.max(
        LEFT_PANEL_MIN_WIDTH,
        nextWidth - RIGHT_PANEL_MIN_WIDTH - SPLITTER_WIDTH
      );

      const nextLeftPaneWidth =
        mode === 'right' || mode === 'corner'
          ? clamp(startLeftPaneWidth, LEFT_PANEL_MIN_WIDTH, maxLeft)
          : startLeftPaneWidth;

      scheduleResizeStateUpdate(nextWidth, nextHeight, nextLeftPaneWidth);
    };

    const onPointerUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }

      const next = pendingResizeRef.current;
      if (next) {
        setDialogSize({ width: next.width, height: next.height });
        setLeftPaneWidth(next.leftPaneWidth);
      }
      pendingResizeRef.current = null;
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = cursor;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleSave = () => {
    if (!task) return;
    const parsedDueDate = progressDueDate;
    const tags = selectedTags;

    const parsedStartDate = progressStartDate;
    onSave(task.id, {
      title: title.trim() || task.title,
      description: description.trim(),
      status,
      priority,
      assigneeId,
      portfolioCompanyId,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      progress: computedProgress,
      tags,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  };

  const panelStyle = {
    width: `${dialogSize.width}px`,
    height: `${dialogSize.height}px`,
    maxWidth: presentation === 'sheet' ? '100vw' : 'calc(100vw - 1rem)',
    maxHeight: presentation === 'sheet' ? '100dvh' : 'calc(100vh - 1rem)',
  } as const;

  const detailBody = (
    <>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-gray-800"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="relative h-full min-h-0 grid grid-cols-1 overflow-y-auto md:overflow-hidden"
          style={
            isDesktopLayout
              ? { gridTemplateColumns: `${clampedLeftPaneWidth}px minmax(0,1fr)` }
              : undefined
          }
        >
          <div className="h-auto md:h-full min-h-0 min-w-0 border-b border-gray-200 md:border-b-0 md:border-r bg-white flex flex-col">
            {presentation === 'dialog' ? (
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="text-2xl">{task.title}</DialogTitle>
                <div className="text-sm text-gray-500">
                  Güncellendi: {format(task.updatedAt, 'd MMM yyyy, HH:mm', { locale: tr })}
                </div>
              </DialogHeader>
            ) : (
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">{task.title}</h2>
                <div className="text-sm text-gray-500">
                  Güncellendi: {format(task.updatedAt, 'd MMM yyyy, HH:mm', { locale: tr })}
                </div>
              </div>
            )}

            <ScrollArea className="min-h-0 px-6 pb-6 md:flex-1">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">İsim</div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Açıklama</div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Durum</div>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  >
                    <option value="brief">{statusLabels.brief}</option>
                    <option value="in-progress">{statusLabels['in-progress']}</option>
                    <option value="review">{statusLabels.review}</option>
                    <option value="revision">{statusLabels.revision}</option>
                    <option value="done">{statusLabels.done}</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Öncelik</div>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                  >
                    <option value="low">{priorityLabels.low}</option>
                    <option value="medium">{priorityLabels.medium}</option>
                    <option value="high">{priorityLabels.high}</option>
                    <option value="urgent">{priorityLabels.urgent}</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Tasarımcı</div>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Atanmamış</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Portföy</div>
                  <select
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                    value={portfolioCompanyId}
                    onChange={(e) => setPortfolioCompanyId(e.target.value)}
                  >
                    <option value="">Atanmamış</option>
                    {portfolioOptions.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Başlangıç Tarihi</div>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Son Teslim</div>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-gray-500">İlerleme</div>
                    <div className="text-xs font-medium text-gray-700">{computedProgress}%</div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${computedProgress}%`,
                        backgroundImage: progressGradient,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Duruma göre otomatik hesaplanır.
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Etiketler</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availableTags.map((tag) => (
                      <LabelChip
                        key={tag}
                        name={tag}
                        color={tagColorMap[tag] ?? '#6161FF'}
                        selected={selectedTags.includes(tag)}
                        onClick={() => toggleTag(tag)}
                        className={selectedTags.includes(tag) ? 'ring-2' : 'opacity-60 hover:opacity-100'}
                      />
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-gray-100">
                      {selectedTags.map((tag) => (
                        <LabelChip
                          key={tag}
                          name={tag}
                          color={tagColorMap[tag] ?? '#6161FF'}
                          onRemove={() => toggleTag(tag)}
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Yeni etiket adı..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(e); } }}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => addNewTag(e)}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      title="Etiket ekle"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {customCols.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">Özel Alanlar</div>
                    <div className="space-y-2">
                      {customCols.map((col) => {
                        const value = customFields[col.id] ?? '';
                        const colType = (col.type as CustomColumnType) ?? 'text';
                        if (colType === 'status') {
                          return (
                            <div key={col.id}>
                              <label className="text-[11px] text-gray-500 block mb-1">{col.label}</label>
                              <select
                                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                                value={value}
                                onChange={(e) =>
                                  setCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
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
                            <div key={col.id}>
                              <label className="text-[11px] text-gray-500 block mb-1">{col.label}</label>
                              <select
                                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                                value={value}
                                onChange={(e) =>
                                  setCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
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
                          <div key={col.id}>
                            <label className="text-[11px] text-gray-500 block mb-1">{col.label}</label>
                            <Input
                              value={value}
                              onChange={(e) =>
                                setCustomFields((prev) => ({ ...prev, [col.id]: e.target.value }))
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
                              className="h-9"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Özet</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `${priorityColors[priority]}20`,
                        color: priorityColors[priority],
                      }}
                    >
                      {priorityLabels[priority]}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-700">{statusLabels[status]}</Badge>
                    {assignee && (
                      <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1">
                        <Avatar
                          className="w-5 h-5"
                          style={{ backgroundColor: assignee.color }}
                        >
                          <AvatarFallback className="text-[10px] text-white">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-700">{assignee.name}</span>
                      </div>
                    )}
                    {selectedPortfolio && (
                      <Badge variant="secondary" className="bg-[#E5E7FF] text-[#4a4ad8]">
                        {selectedPortfolio.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-2 p-4 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {task.archived && onRestoreFromArchive && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-200 transition-opacity hover:opacity-90"
                    onClick={() => onRestoreFromArchive(task.id)}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Arşivden çıkar
                  </Button>
                )}
                {!task.archived && onArchive && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-200 transition-opacity hover:opacity-90"
                    onClick={() => onArchive(task.id)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Arşivle
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {task.archived ? 'Kalıcı sil' : 'Görevi Sil'}
                </Button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Vazgeç
                </Button>
                <Button className="bg-[#6161FF] hover:bg-[#5050E0]" onClick={handleSave}>
                  Kaydet
                </Button>
              </div>
            </div>
          </div>

          {isDesktopLayout && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Panel genişliği"
              className="absolute top-0 bottom-0 z-20 hidden cursor-col-resize md:block"
              style={{
                left: `${clampedLeftPaneWidth - SPLITTER_WIDTH / 2}px`,
                width: `${SPLITTER_WIDTH}px`,
              }}
              onPointerDown={handleResizeStart('split')}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-300 hover:bg-[#6161FF]" />
            </div>
          )}

          <div className="h-auto md:h-full min-h-0 min-w-0 bg-white flex flex-col">
            <div className="px-6 pt-6">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 pr-12">
                <Button
                  variant={activeTab === 'updates' ? 'default' : 'ghost'}
                  className={activeTab === 'updates' ? 'bg-[#6161FF] hover:bg-[#5050E0]' : ''}
                  onClick={() => setActiveTab('updates')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Güncellemeler
                </Button>
                <Button
                  variant={activeTab === 'files' ? 'default' : 'ghost'}
                  className={activeTab === 'files' ? 'bg-[#6161FF] hover:bg-[#5050E0]' : ''}
                  onClick={() => setActiveTab('files')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Belge
                </Button>
                <Button
                  variant={activeTab === 'history' ? 'default' : 'ghost'}
                  className={activeTab === 'history' ? 'bg-[#6161FF] hover:bg-[#5050E0]' : ''}
                  onClick={() => setActiveTab('history')}
                >
                  <History className="h-4 w-4 mr-2" />
                  Etkinlik Günlüğü
                </Button>
              </div>
            </div>

            {activeTab === 'updates' ? (
              <div className="flex flex-col min-h-0 px-6 py-5 md:flex-1 overflow-hidden">
                <TaskCommentsPanel key={task.id} task={task} onTaskUpdate={onTaskUpdate} />
              </div>
            ) : (
            <ScrollArea className="min-h-0 px-6 py-5 md:flex-1">
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Belgeler</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[#6161FF] border-[#6161FF]/30 hover:bg-[#6161FF]/5"
                      onClick={() => setIsUploadDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4" />
                      Belge Ekle
                    </Button>
                  </div>
                  {(task.attachments ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                      Bu görev için henüz belge yok.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(task.attachments ?? []).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                        >
                          <FileText className="h-8 w-8 text-[#6161FF] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{att.name}</p>
                            <p className="text-xs text-gray-500">
                              {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''} · {format(new Date(att.uploadedAt), 'd MMM yyyy', { locale: tr })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => onRemoveAttachment?.(task.id, att.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <DocumentUploadDialog
                    open={isUploadDialogOpen}
                    onClose={() => setIsUploadDialogOpen(false)}
                    taskTitle={task.title}
                    onUpload={(attachment) => {
                      onAddAttachment?.(task.id, attachment);
                      setIsUploadDialogOpen(false);
                    }}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Oluşturulma
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(task.createdAt, 'd MMM yyyy, HH:mm', { locale: tr })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <History className="h-4 w-4 text-gray-500" />
                      Son Güncelleme
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(task.updatedAt, 'd MMM yyyy, HH:mm', { locale: tr })}
                    </div>
                  </div>
                  {(task.activityLog ?? []).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500">Etkinlik Geçmişi</div>
                      {[...(task.activityLog ?? [])]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-gray-200 p-3"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                              <History className="h-4 w-4 text-gray-500 shrink-0" />
                              {entry.action}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{entry.note}</div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {format(new Date(entry.date), 'd MMM yyyy, HH:mm', { locale: tr })} · {entry.author}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            )}
          </div>
        </div>

        {isDesktopLayout && presentation === 'dialog' && (
          <>
            <div
              className="absolute inset-y-0 right-0 z-30 hidden w-2 cursor-col-resize md:block"
              onPointerDown={handleResizeStart('right')}
            />
            <div
              className="absolute inset-x-0 bottom-0 z-30 hidden h-2 cursor-row-resize md:block"
              onPointerDown={handleResizeStart('bottom')}
            />
            <div
              className="absolute bottom-0 right-0 z-40 hidden h-4 w-4 cursor-nwse-resize md:block"
              onPointerDown={handleResizeStart('corner')}
            >
              <span className="absolute right-1 bottom-1 h-2 w-2 border-r-2 border-b-2 border-gray-400" />
            </div>
          </>
        )}
    </>
  );

  if (presentation === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            'relative max-w-none gap-0 overflow-hidden border-l border-gray-200 !w-[min(1320px,100vw)] sm:!max-w-[min(1320px,100vw)]'
          )}
          style={panelStyle}
        >
          <SheetTitle className="sr-only">{task.title}</SheetTitle>
          {detailBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-none p-0 overflow-hidden"
        style={panelStyle}
      >
        {detailBody}
      </DialogContent>
    </Dialog>
  );
}

export function TaskDetailDialog({
  open,
  task,
  portfolioOptions,
  tableColumnSchema = [],
  onClose,
  onSave,
  onDelete,
  onArchive,
  onRestoreFromArchive,
  onAddAttachment,
  onRemoveAttachment,
  onTaskUpdate,
  availableTags = [],
  tagColorMap = {},
  onAddTag,
  tagServiceMap = {},
  onSetTagService,
  presentation = 'dialog',
}: TaskDetailDialogProps) {
  if (!task) return null;

  return (
    <TaskDetailDialogContent
      key={task.id}
      open={open}
      task={task}
      portfolioOptions={portfolioOptions}
      tableColumnSchema={tableColumnSchema}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      onArchive={onArchive}
      onRestoreFromArchive={onRestoreFromArchive}
      onAddAttachment={onAddAttachment}
      onRemoveAttachment={onRemoveAttachment}
      onTaskUpdate={onTaskUpdate}
      availableTags={availableTags}
      tagColorMap={tagColorMap}
      onAddTag={onAddTag}
      tagServiceMap={tagServiceMap}
      onSetTagService={onSetTagService}
      presentation={presentation}
    />
  );
}
