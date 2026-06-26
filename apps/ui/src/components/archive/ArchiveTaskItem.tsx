import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PRIORITY_COLORS as priorityColors } from '@/lib/constants';
import type { Task } from '@/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MoreVertical, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArchiveTaskItemProps {
  task: Task;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  onRestore: () => void;
  onRequestPermanentDelete: () => void;
}

export function ArchiveTaskItem({
  task,
  selected,
  onToggleSelect,
  onOpenDetail,
  onRestore,
  onRequestPermanentDelete,
}: ArchiveTaskItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200',
            'hover:border-gray-200 hover:shadow-md hover:bg-gray-50/80',
            selected && 'border-[#6161FF]/30 bg-[#6161FF]/[0.04] ring-1 ring-[#6161FF]/20'
          )}
        >
          <input
            type="checkbox"
            className="mt-2 h-4 w-4 shrink-0 rounded border-gray-300 text-[#6161FF] focus:ring-[#6161FF]"
            checked={selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Seç: ${task.title}`}
          />
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={onOpenDetail}
          >
            <span
              className="mt-2 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: priorityColors[task.priority] }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Güncellendi {format(task.updatedAt, 'd MMM yyyy, HH:mm', { locale: tr })}
              </p>
            </div>
            {task.assignee ? (
              <Avatar className="h-6 w-6 shrink-0" style={{ backgroundColor: task.assignee.color }}>
                <AvatarFallback className="text-[10px] text-white">{task.assignee.initials}</AvatarFallback>
              </Avatar>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-70 transition-opacity hover:opacity-100 md:hidden"
                aria-label="Görev işlemleri"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  onRestore();
                }}
              >
                <Undo2 className="h-4 w-4" />
                Arşivden çıkar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  onRequestPermanentDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Kalıcı sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem className="gap-2" onSelect={onRestore}>
          <Undo2 className="h-4 w-4" />
          Arşivden çıkar
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" className="gap-2" onSelect={onRequestPermanentDelete}>
          <Trash2 className="h-4 w-4" />
          Kalıcı sil
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
