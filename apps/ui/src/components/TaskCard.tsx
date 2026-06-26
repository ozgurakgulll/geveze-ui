import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Archive,
  Calendar,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  User as UserIcon,
  UserRoundCog,
} from 'lucide-react';
import type { Task, User, TaskAttachment } from '@/types';
import type { TaskStatus, Priority } from '@/types';
import { PRIORITY_COLORS as priorityColors, PRIORITY_LABELS as priorityLabels, STATUS_LABELS as statusLabels, COLUMN_DEFINITIONS } from '@/lib/constants';
import { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { TaskCommentsPanel } from '@/components/TaskCommentsPanel';
import { DocumentUploadDialog } from '@/components/DocumentUploadDialog';
import { getTaskProgress, getTaskProgressGradient } from '@/lib/taskProgress';
import { isTaskOverdue } from '@/lib/taskOverdue';
import { LabelChip } from '@/components/ui/LabelChip';

export type TaskCardUpdatePayload = {
  assignee?: User | null;
  status?: TaskStatus;
  priority?: Priority;
};

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  onOpenTask?: (taskId: string) => void;
  users?: User[];
  onTaskUpdate?: (taskId: string, updates: TaskCardUpdatePayload) => void;
  onAddAttachment?: (taskId: string, attachment: TaskAttachment) => void;
  tagColorMap?: Record<string, string>;
  onBulkDeleteTasks?: (taskIds: string[]) => void;
  onBulkReassignTasks?: (taskIds: string[], assigneeId: string) => void;
  onBulkArchiveTasks?: (taskIds: string[]) => void;
}

export function TaskCard({
  task,
  isOverlay = false,
  onOpenTask,
  users = [],
  onTaskUpdate,
  onAddAttachment,
  tagColorMap = {},
  onBulkDeleteTasks,
  onBulkReassignTasks,
  onBulkArchiveTasks,
}: TaskCardProps) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(2);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reassignPending, setReassignPending] = useState<{ assigneeId: string; assigneeName: string } | null>(
    null
  );

  const showTaskMenu =
    !isOverlay &&
    Boolean(
      onOpenTask ||
        onBulkDeleteTasks ||
        onBulkArchiveTasks ||
        onBulkReassignTasks
    );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityIcon = () => {
    switch (task.priority) {
      case 'urgent':
        return <AlertCircle className="h-3 w-3" />;
      case 'high':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const isOverdue = isTaskOverdue(task);
  const attachmentCount = (task.attachments ?? []).length;
  const progress = getTaskProgress(task);
  const progressGradient = getTaskProgressGradient(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => {
        if (!isOverlay && !isCommentsOpen) onOpenTask?.(task.id);
      }}
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 p-4 cursor-grab',
        'hover:shadow-lg hover:border-[#6161FF]/30 transition-all duration-200',
        'active:cursor-grabbing',
        isDragging && 'opacity-50 rotate-2 shadow-xl border-[#6161FF]',
        isOverlay && 'shadow-2xl rotate-2 scale-105 cursor-grabbing z-50',
        isOverdue && 'border-red-300 bg-red-50/30'
      )}
    >
      {/* Top Actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <LabelChip
              key={tag}
              name={tag}
              color={tagColorMap[tag] ?? '#6161FF'}
            />
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-gray-400 self-center">+{task.tags.length - 3}</span>
          )}
        </div>
        {showTaskMenu ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded shrink-0"
                  aria-label="Görev işlemleri"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {onOpenTask ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      onOpenTask(task.id);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Düzenle
                  </DropdownMenuItem>
                ) : null}
                {onBulkReassignTasks && users.length > 0 ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserRoundCog className="h-4 w-4" />
                      Devret
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-48 overflow-y-auto">
                      {users.map((u) => (
                        <DropdownMenuItem
                          key={u.id}
                          onSelect={() => setReassignPending({ assigneeId: u.id, assigneeName: u.name })}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white shrink-0"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.initials}
                          </span>
                          <span className="truncate">{u.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null}
                {onBulkArchiveTasks ? (
                  <DropdownMenuItem onSelect={() => setArchiveDialogOpen(true)}>
                    <Archive className="h-4 w-4" />
                    Arşivle
                  </DropdownMenuItem>
                ) : null}
                {onBulkDeleteTasks ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {onBulkArchiveTasks ? (
              <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogContent
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>Görevi arşivle</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{task.title}” arşive taşınacak; ana listede (tahta, tablo vb.) görünmez olur. Arşivden
                      geri yükleyebilirsiniz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      onClick={() => {
                        onBulkArchiveTasks([task.id]);
                        setArchiveDialogOpen(false);
                      }}
                    >
                      Arşivle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}

            {onBulkReassignTasks ? (
              <AlertDialog
                open={reassignPending !== null}
                onOpenChange={(open) => {
                  if (!open) setReassignPending(null);
                }}
              >
                <AlertDialogContent
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>Görevi devret</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">“{task.title}”</span> görevini{' '}
                          <span className="font-medium text-foreground">
                            {reassignPending?.assigneeName ?? '…'}
                          </span>{' '}
                          kişisine devretmek istiyor musunuz?
                        </p>
                        {task.assignee ? (
                          <p>
                            Mevcut atanan:{' '}
                            <span className="font-medium text-foreground">{task.assignee.name}</span>
                          </p>
                        ) : (
                          <p>Görev şu an kimseye atanmamış.</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      onClick={() => {
                        if (reassignPending) {
                          onBulkReassignTasks([task.id], reassignPending.assigneeId);
                        }
                        setReassignPending(null);
                      }}
                    >
                      Devret
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}

            {onBulkDeleteTasks ? (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>Görevi sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{task.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        onBulkDeleteTasks([task.id]);
                        setDeleteDialogOpen(false);
                      }}
                    >
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </>
        ) : (
          <div className="w-7 h-7 shrink-0" aria-hidden />
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">İlerleme</span>
          <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundImage: progressGradient,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Priority & Status - clickable when onTaskUpdate provided */}
          {!isOverlay && onTaskUpdate ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: priorityColors[task.priority] }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {getPriorityIcon()}
                  <span>{priorityLabels[task.priority]}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Görev Durumu</span>
                </div>
                <div className="p-1 max-h-32 overflow-y-auto">
                  {COLUMN_DEFINITIONS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                        task.status === col.id ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                      )}
                      onClick={() => onTaskUpdate(task.id, { status: col.id })}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      {statusLabels[col.id as keyof typeof statusLabels]}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Öncelik</span>
                </div>
                <div className="p-1 flex flex-wrap gap-1">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        task.priority === p ? 'ring-1 ring-[#6161FF]' : 'hover:bg-gray-100'
                      )}
                      style={{ color: priorityColors[p] }}
                      onClick={() => onTaskUpdate(task.id, { priority: p })}
                    >
                      {priorityLabels[p]}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: priorityColors[task.priority] }}>
              {getPriorityIcon()}
              <span>{priorityLabels[task.priority]}</span>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{format(task.dueDate, 'd MMM', { locale: tr })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {/* Comments */}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#6161FF]"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentsOpen(true);
            }}
          >
            <MessageSquare className="h-3 w-3" />
            <span>{commentCount}</span>
          </button>

          {/* Attachments - DocumentUploadDialog */}
          {!isOverlay && onAddAttachment && (
            <>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#6161FF]"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUploadDialogOpen(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Paperclip className="h-3 w-3" />
                <span>{attachmentCount}</span>
              </button>
              <DocumentUploadDialog
                open={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                taskTitle={task.title}
                onUpload={(attachment) => {
                  onAddAttachment(task.id, attachment);
                  setIsUploadDialogOpen(false);
                }}
              />
            </>
          )}

          {/* Assignee - Popover */}
          {!isOverlay && onTaskUpdate && users.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#6161FF]/50">
                  {task.assignee ? (
                    <Avatar
                      className="w-6 h-6 border-2 border-white cursor-pointer hover:ring-2 hover:ring-[#6161FF]/30"
                      style={{ backgroundColor: task.assignee.color }}
                      title={task.assignee.name}
                    >
                      <AvatarFallback className="text-[10px] font-medium text-white">
                        {task.assignee.initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#6161FF]/50 hover:bg-[#6161FF]/5 cursor-pointer">
                      <UserIcon className="h-3 w-3 text-gray-400" />
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-0" align="end">
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Atanan Kişi</span>
                </div>
                <div className="p-1 max-h-40 overflow-y-auto">
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                      !task.assignee ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                    )}
                    onClick={() => onTaskUpdate(task.id, { assignee: null })}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
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
                        task.assignee?.id === u.id ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                      )}
                      onClick={() => onTaskUpdate(task.id, { assignee: u })}
                    >
                      <Avatar className="w-6 h-6 shrink-0" style={{ backgroundColor: u.color }}>
                        <AvatarFallback className="text-[10px] font-medium text-white">{u.initials}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : task.assignee ? (
            <Avatar
              className="w-6 h-6 border-2 border-white"
              style={{ backgroundColor: task.assignee.color }}
              title={task.assignee.name}
            >
              <AvatarFallback className="text-[10px] font-medium text-white">
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </div>

      {/* Done Indicator */}
      {task.status === 'done' && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </div>
      )}

      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent
          className="max-w-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Yorumlar</DialogTitle>
            <div className="text-sm text-gray-500">{task.title}</div>
          </DialogHeader>
          <TaskCommentsPanel task={task} onCountChange={setCommentCount} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
