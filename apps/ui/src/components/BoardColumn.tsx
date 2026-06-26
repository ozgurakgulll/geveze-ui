import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Filter, User as UserIcon, Building2, X } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Column, Task } from '@/types';
import type { User } from '@/types';
import type { PortfolioCompany } from '@/types';

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onAddQuickBoardTask: (columnId: string) => void;
  onTaskClick: (taskId: string) => void;
  users?: User[];
  companies?: PortfolioCompany[];
  assigneeFilterId?: string | null;
  portfolioFilterId?: string | null;
  onAssigneeFilterChange?: (id: string | null) => void;
  onPortfolioFilterChange?: (id: string | null) => void;
  onTaskUpdate?: (taskId: string, updates: { assignee?: import('@/types').User | null; status?: import('@/types').TaskStatus; priority?: import('@/types').Priority }) => void;
  onAddAttachment?: (taskId: string, attachment: import('@/types').TaskAttachment) => void;
  onBulkDeleteTasks?: (taskIds: string[]) => void;
  onBulkReassignTasks?: (taskIds: string[], assigneeId: string) => void;
  onBulkArchiveTasks?: (taskIds: string[]) => void;
}

export function BoardColumn({
  column,
  tasks,
  onAddTask,
  onAddQuickBoardTask,
  onTaskClick,
  users = [],
  companies = [],
  assigneeFilterId = null,
  portfolioFilterId = null,
  onAssigneeFilterChange,
  onPortfolioFilterChange,
  onTaskUpdate,
  onAddAttachment,
  onBulkDeleteTasks,
  onBulkReassignTasks,
  onBulkArchiveTasks,
}: BoardColumnProps) {
  const hasFilters = assigneeFilterId || portfolioFilterId;
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Combine refs
  const setRefs = (el: HTMLDivElement | null) => {
    setSortableRef(el);
    setDroppableRef(el);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex flex-col w-[280px] min-w-[280px] max-w-[320px] sm:min-w-[300px] md:w-[320px] md:min-w-[320px] md:max-w-[320px] bg-gray-50/50 rounded-xl border border-gray-200/60',
        'transition-all duration-200',
        isDragging && 'opacity-50 rotate-1 shadow-xl border-[#6161FF]',
        isOver && 'bg-[#E5E7FF]/30 border-[#6161FF]/50 ring-2 ring-[#6161FF]/20'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-900">{column.title}</h3>
          <Badge
            variant="secondary"
            className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {tasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7', hasFilters ? 'text-[#6161FF]' : 'text-gray-400 hover:text-gray-600')}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Filtrele</span>
              </div>
              <div className="p-2 space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1.5">
                    <UserIcon className="h-3.5 w-3.5" />
                    Kişi
                  </div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                        !assigneeFilterId ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                      )}
                      onClick={() => onAssigneeFilterChange?.(null)}
                    >
                      Tümü
                    </button>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                          assigneeFilterId === u.id ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                        )}
                        onClick={() => onAssigneeFilterChange?.(assigneeFilterId === u.id ? null : u.id)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.initials}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Portföy
                  </div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                        !portfolioFilterId ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                      )}
                      onClick={() => onPortfolioFilterChange?.(null)}
                    >
                      Tümü
                    </button>
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm',
                          portfolioFilterId === c.id ? 'bg-[#6161FF]/10 text-[#6161FF]' : 'hover:bg-gray-100'
                        )}
                        onClick={() => onPortfolioFilterChange?.(portfolioFilterId === c.id ? null : c.id)}
                      >
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {hasFilters && (
                <div className="p-2 border-t border-gray-100">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#6161FF] py-1.5"
                    onClick={() => {
                      onAssigneeFilterChange?.(null);
                      onPortfolioFilterChange?.(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-[#6161FF]"
            title="Yeni görev ekle"
            aria-label="Yeni görev ekle"
            onClick={() => onAddQuickBoardTask(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tasks Container */}
      <ScrollArea className="flex-1 p-3">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 min-h-[100px]">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenTask={onTaskClick}
                users={users}
                onTaskUpdate={onTaskUpdate}
                onAddAttachment={onAddAttachment}
                
                onBulkDeleteTasks={onBulkDeleteTasks}
                onBulkReassignTasks={onBulkReassignTasks}
                onBulkArchiveTasks={onBulkArchiveTasks}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Add Task Button */}
      <div className="p-3 border-t border-gray-200/60">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-500 hover:text-[#6161FF] hover:bg-[#E5E7FF]/50"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="h-4 w-4" />
          <span>Görev Ekle</span>
        </Button>
      </div>
    </div>
  );
}
