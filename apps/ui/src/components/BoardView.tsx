import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import type { Column, Task, User, PortfolioCompany } from '@/types';
import { COLUMN_DEFINITIONS } from '@/lib/constants';
import { getTaskProgress } from '@/lib/taskProgress';

/** v2: önceki sürümde sütun başına kayıtlı sıra, üst bardaki Sırala (global) sırasını eziyordu */
const TASK_ORDER_STORAGE_KEY = 'geveze.crm.taskOrderByColumn.v2';

const loadTaskOrderByColumn = (): Record<string, string[]> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TASK_ORDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof key === 'string' && Array.isArray(val) && val.every((id): id is string => typeof id === 'string')) {
        result[key] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
};

type ColumnFilter = { assigneeId: string | null; portfolioId: string | null };

interface BoardViewProps {
  tasks: Task[];
  onTasksChange: Dispatch<SetStateAction<Task[]>>;
  onAddTask: (columnId?: string, dueDate?: Date, assigneeId?: string) => void;
  onAddQuickBoardTask: (columnId: string) => void;
  onTaskClick: (taskId: string) => void;
  users: User[];
  companies: PortfolioCompany[];
  onAddAttachment?: (taskId: string, attachment: import('@/types').TaskAttachment) => void;
  onBulkDeleteTasks?: (taskIds: string[]) => void;
  onBulkReassignTasks?: (taskIds: string[], assigneeId: string) => void;
  onBulkArchiveTasks?: (taskIds: string[]) => void;
  /** Üst bardaki Sırala değişince sütun içi kayıtlı sıra sıfırlanır (global sıra tüm sütunlarda geçerli olsun) */
  boardSortBy: 'dueDate' | 'priority' | 'title';
  boardSortDir: 'asc' | 'desc';
}

export function BoardView({
  tasks,
  onTasksChange,
  onAddTask,
  onAddQuickBoardTask,
  onTaskClick,
  users,
  companies,
  onAddAttachment,
  onBulkDeleteTasks,
  onBulkReassignTasks,
  onBulkArchiveTasks,
  boardSortBy,
  boardSortDir,
}: BoardViewProps) {
  const [columnOrder, setColumnOrder] = useState<Column['id'][]>(() =>
    COLUMN_DEFINITIONS.map((column) => column.id)
  );
  const [taskOrderByColumn, setTaskOrderByColumn] = useState<Record<string, string[]>>(loadTaskOrderByColumn);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const prevHeaderSortRef = useRef<{ by?: typeof boardSortBy; dir?: typeof boardSortDir }>({});

  useEffect(() => {
    const p = prevHeaderSortRef.current;
    const hadPrev = p.by !== undefined;
    const changed = hadPrev && (p.by !== boardSortBy || p.dir !== boardSortDir);
    prevHeaderSortRef.current = { by: boardSortBy, dir: boardSortDir };
    if (changed) {
      setTaskOrderByColumn({});
    }
  }, [boardSortBy, boardSortDir]);

  const getColumnFilter = useCallback(
    (columnId: string) => columnFilters[columnId] ?? { assigneeId: null, portfolioId: null },
    [columnFilters]
  );

  const updateColumnFilter = useCallback((columnId: string, updates: Partial<ColumnFilter>) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: { ...(prev[columnId] ?? { assigneeId: null, portfolioId: null }), ...updates },
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (Object.keys(taskOrderByColumn).length === 0) return;
    window.localStorage.setItem(TASK_ORDER_STORAGE_KEY, JSON.stringify(taskOrderByColumn));
  }, [taskOrderByColumn]);

  const visibleColumnOrder = columnOrder;

  const columns = useMemo<Column[]>(
    () =>
      visibleColumnOrder.map((columnId) => {
        const baseColumn = COLUMN_DEFINITIONS.find((column) => column.id === columnId);
        const title = baseColumn?.title ?? columnId;
        const color = baseColumn?.color ?? '#64748B';
        const filter = getColumnFilter(columnId);
        let columnTasks = tasks
          .filter((task) => task.status === columnId)
          .filter((task) => {
            const matchAssignee = !filter.assigneeId || task.assignee?.id === filter.assigneeId;
            const matchPortfolio = !filter.portfolioId || task.portfolioCompanyId === filter.portfolioId;
            return matchAssignee && matchPortfolio;
          });
        const order = taskOrderByColumn[columnId];
        if (order?.length) {
          const orderMap = new Map(order.map((id, i) => [id, i]));
          columnTasks = [...columnTasks].sort((a, b) => {
            const ai = orderMap.get(a.id) ?? 9999;
            const bi = orderMap.get(b.id) ?? 9999;
            return ai - bi;
          });
        }
        return {
          id: columnId,
          title,
          color,
          tasks: columnTasks,
        };
      }),
    [visibleColumnOrder, tasks, getColumnFilter, taskOrderByColumn]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const findTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find((task) => task.id === taskId);
  }, [tasks]);

  const findColumnByTaskId = useCallback((taskId: string): Column | undefined => {
    const task = findTaskById(taskId);
    if (!task) return undefined;
    return columns.find((column) => column.id === task.status);
  }, [columns, findTaskById]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging a task
    const task = findTaskById(activeId);
    if (task) {
      setActiveTask(task);
    } else {
      // Dragging a column
      const col = columns.find((c) => c.id === activeId);
      if (col) {
        setActiveColumn(col);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Don't do anything if dragging over itself
    if (activeId === overId) return;

    // Check if dragging a task
    const activeColumn = findColumnByTaskId(activeId);
    const overColumnId = columns.some((c) => c.id === overId)
      ? overId
      : findTaskById(overId)?.status ?? null;
    const overColumn = overColumnId ? columns.find((c) => c.id === overColumnId) : undefined;

    if (!activeColumn || !overColumn) return;

    if (activeColumn.id !== overColumn.id) {
      onTasksChange((prev) =>
        prev.map((task) =>
          task.id === activeId
            ? (() => {
                const nextTask: Task = {
                  ...task,
                  status: overColumn.id,
                  updatedAt: new Date(),
                  progress: task.progress,
                };
                return { ...nextTask, progress: getTaskProgress(nextTask) };
              })()
            : task
        )
      );
    }
  };

  const resolveOverToColumnId = useCallback(
    (overId: string): string | null => {
      if (columns.some((c) => c.id === overId)) return overId;
      const task = findTaskById(overId);
      return task ? task.status : null;
    },
    [columns, findTaskById]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const activeId = active.id as string;
    const overId = over?.id as string | undefined;
    const isColumn = columns.some((c) => c.id === activeId);
    const isTask = !!findTaskById(activeId);

    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    if (activeId === overId) return;

    // Check if reordering columns
    if (isColumn && overId) {
      const overColumnId = resolveOverToColumnId(overId);
      if (!overColumnId || overColumnId === activeId) return;
      const targetColumnId = overColumnId;
      setColumnOrder((prev) => {
        const oldIndex = prev.findIndex((c) => c === activeId);
        const newIndex = prev.findIndex((c) => c === targetColumnId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    // Task reorder within same column
    if (isTask && overId) {
      const overTask = findTaskById(overId);
      const activeCol = findColumnByTaskId(activeId);
      const overCol = overTask ? findColumnByTaskId(overId) : undefined;
      if (overTask && activeCol && overCol && activeCol.id === overCol.id) {
        const col = columns.find((c) => c.id === activeCol.id);
        if (col) {
          const currentOrder = taskOrderByColumn[col.id] ?? col.tasks.map((t) => t.id);
          const oldIndex = currentOrder.indexOf(activeId);
          const newIndex = currentOrder.indexOf(overId);
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            setTaskOrderByColumn((prev) => ({
              ...prev,
              [col.id]: arrayMove(currentOrder, oldIndex, newIndex),
            }));
          }
        }
      }
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: { assignee?: User | null; status?: Column['id']; priority?: Task['priority'] }) => {
      onTasksChange((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const next: Task = {
            ...t,
            updatedAt: new Date(),
            ...(updates.assignee !== undefined && { assignee: updates.assignee ?? undefined }),
            ...(updates.status !== undefined && { status: updates.status }),
            ...(updates.priority !== undefined && { priority: updates.priority }),
          };
          if (updates.status !== undefined) {
            next.progress = getTaskProgress(next);
          }
          return next;
        })
      );
    },
    [onTasksChange]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <div className="flex gap-3 md:gap-4 p-4 md:p-6 min-h-[calc(100vh-200px)]">
            <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => {
              const filter = getColumnFilter(column.id);
              return (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={column.tasks}
                  onAddTask={onAddTask}
                  onAddQuickBoardTask={onAddQuickBoardTask}
                  onTaskClick={onTaskClick}
                  users={users}
                  companies={companies}
                  assigneeFilterId={filter.assigneeId}
                  portfolioFilterId={filter.portfolioId}
                  onAssigneeFilterChange={(id) => updateColumnFilter(column.id, { assigneeId: id })}
                  onPortfolioFilterChange={(id) => updateColumnFilter(column.id, { portfolioId: id })}
                  onTaskUpdate={handleTaskUpdate}
                  onAddAttachment={onAddAttachment}

                  onBulkDeleteTasks={onBulkDeleteTasks}
                  onBulkReassignTasks={onBulkReassignTasks}
                  onBulkArchiveTasks={onBulkArchiveTasks}
                />
              );
            })}
          </SortableContext>
        </div>
        </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <TaskCard task={activeTask} isOverlay onOpenTask={onTaskClick} /> : null}
        {activeColumn ? (
          <div className="w-[320px] bg-gray-50 rounded-xl border-2 border-[#6161FF] p-4 opacity-90">
            <h3 className="font-semibold text-gray-900">{activeColumn.title}</h3>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    </div>
  );
}
