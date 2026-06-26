import { useState, useRef, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Task } from '@/types';
import { getTaskProgress, getTaskProgressGradient } from '@/lib/taskProgress';
import { STATUS_LABELS as statusLabels } from '@/lib/constants';

/** yyyy-MM-dd → yerel tarih (saat dilimi kayması olmadan) */
function parseDateInput(s: string): Date {
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

const statusColors: Record<Task['status'], string> = {
  brief: '#64748B',
  'in-progress': '#F59E0B',
  review: '#6366F1',
  revision: '#EF4444',
  done: '#10B981',
};

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onAddTask?: (columnId?: string, dueDate?: Date, assigneeId?: string) => void;
  onTaskDatesChange?: (taskId: string, startDate: Date, dueDate: Date) => void;
}

export function TimelineView({ tasks, onTaskClick, onAddTask, onTaskDatesChange }: TimelineViewProps) {
  /** Seçilen güne göre 4 haftalık pencere (Pazartesi başlangıç) */
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { startDate, endDate } = useMemo(() => {
    const s = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const e = endOfWeek(addDays(s, 21), { weekStartsOn: 1 });
    return { startDate: s, endDate: e };
  }, [anchorDate]);

  const timelineItems = useMemo(
    () =>
      tasks.map((task) => ({
        id: `timeline-${task.id}`,
        taskId: task.id,
        title: task.title,
        startDate: task.createdAt,
        endDate: task.dueDate || new Date(task.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        progress: getTaskProgress(task),
        progressGradient: getTaskProgressGradient(task),
        assignee: task.assignee,
        status: task.status,
        color: statusColors[task.status],
      })),
    [tasks]
  );

  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const goToPrevious = () => {
    setAnchorDate((prev) => addDays(prev, -7));
  };

  const goToNext = () => {
    setAnchorDate((prev) => addDays(prev, 7));
  };

  const goToToday = () => {
    setAnchorDate(new Date());
  };

  const handleAnchorDateInput = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!v) return;
    setAnchorDate(parseDateInput(v));
  };

  const dayWidth = 50 * zoom;
  const totalGridWidth = dates.length * dayWidth;
  const msPerDay = 24 * 60 * 60 * 1000;
  const gridStartMs = startDate.getTime();
  const gridEndMs = endDate.getTime();

  const getItemPosition = (start: Date, end: Date): { left: number; width: number; visible: boolean } => {
    const startMs = start.getTime();
    const endMs = end.getTime();

    // Bar tamamen geçmişte veya gelecekteyse gösterme
    if (endMs < gridStartMs) return { left: 0, width: 0, visible: false }; // Tamamen geçmişte
    if (startMs > gridEndMs) return { left: 0, width: 0, visible: false }; // Tamamen gelecekte

    const startOffsetDays = (startMs - gridStartMs) / msPerDay;
    const durationDays = (endMs - startMs) / msPerDay;

    let left = startOffsetDays * dayWidth;
    let width = Math.max(durationDays * dayWidth, 4);

    // Görünür alan içinde kırp
    if (left < 0) {
      width = width + left;
      left = 0;
    }
    if (left + width > totalGridWidth) {
      width = totalGridWidth - left;
    }
    width = Math.max(width, 4);

    return { left, width, visible: true };
  };

  const getElapsedRemaining = (start: Date, end: Date) => {
    const today = new Date();
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return { elapsedPercent: 100, remainingPercent: 0 };

    if (today.getTime() <= start.getTime()) {
      return { elapsedPercent: 0, remainingPercent: 100 };
    }
    if (today.getTime() >= end.getTime()) {
      return { elapsedPercent: 100, remainingPercent: 0 };
    }
    const elapsedMs = today.getTime() - start.getTime();
    const remainingMs = end.getTime() - today.getTime();
    const elapsedPercent = (elapsedMs / totalMs) * 100;
    const remainingPercent = (remainingMs / totalMs) * 100;
    return { elapsedPercent, remainingPercent };
  };

  type DragMode = 'left' | 'right' | 'body';
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: DragMode;
    startClientX: number;
    startStartDate: Date;
    startEndDate: Date;
    originalStartDate: Date;
    originalEndDate: Date;
  } | null>(null);

  const handleBarPointerDown = useCallback(
    (e: React.PointerEvent, item: (typeof timelineItems)[0], mode: DragMode) => {
      if (!onTaskDatesChange) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        taskId: item.taskId,
        mode,
        startClientX: e.clientX,
        startStartDate: new Date(item.startDate.getTime()),
        startEndDate: new Date(item.endDate.getTime()),
        originalStartDate: new Date(item.startDate.getTime()),
        originalEndDate: new Date(item.endDate.getTime()),
      });
    },
    [onTaskDatesChange, timelineItems]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState || !onTaskDatesChange) return;
      const deltaPx = e.clientX - dragState.startClientX;
      const daysDelta = Math.round(deltaPx / dayWidth);
      if (daysDelta === 0) return;

      const { mode, startStartDate, startEndDate } = dragState;
      const minDurationMs = 24 * 60 * 60 * 1000;

      let newStart: Date;
      let newEnd: Date;

      if (mode === 'left') {
        newStart = addDays(startStartDate, daysDelta);
        newEnd = new Date(startEndDate.getTime());
        if (newStart.getTime() >= newEnd.getTime() - minDurationMs) {
          newStart = new Date(newEnd.getTime() - minDurationMs);
        }
      } else if (mode === 'right') {
        newStart = new Date(startStartDate.getTime());
        newEnd = addDays(startEndDate, daysDelta);
        if (newEnd.getTime() <= newStart.getTime() + minDurationMs) {
          newEnd = new Date(newStart.getTime() + minDurationMs);
        }
      } else {
        newStart = addDays(startStartDate, daysDelta);
        newEnd = addDays(startEndDate, daysDelta);
      }

      setDragState((prev) =>
        prev ? { ...prev, startClientX: e.clientX, startStartDate: newStart, startEndDate: newEnd } : null
      );
    },
    [dragState, dayWidth, onTaskDatesChange]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState && onTaskDatesChange) {
      const changed =
        dragState.startStartDate.getTime() !== dragState.originalStartDate.getTime() ||
        dragState.startEndDate.getTime() !== dragState.originalEndDate.getTime();
      if (changed) {
        onTaskDatesChange(dragState.taskId, dragState.startStartDate, dragState.startEndDate);
      }
    }
    setDragState(null);
  }, [dragState, onTaskDatesChange]);

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, handlePointerMove, handlePointerUp]);

  const resolveDragMode = (offsetX: number, barWidth: number): DragMode => {
    const edgeSize = 8;
    if (offsetX < edgeSize) return 'left';
    if (offsetX > barWidth - edgeSize) return 'right';
    return 'body';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Bugün
          </Button>
          <div className="flex flex-wrap items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="timeline-anchor-date" className="text-xs text-gray-500 whitespace-nowrap">
                Tarih
              </Label>
              <Input
                id="timeline-anchor-date"
                type="date"
                value={format(anchorDate, 'yyyy-MM-dd')}
                onChange={handleAnchorDateInput}
                className="h-9 w-[150px] text-sm"
              />
            </div>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {format(startDate, 'd MMM', { locale: tr })} – {format(endDate, 'd MMM yyyy', { locale: tr })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="min-w-max">
            {/* Dates Header */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
              {/* Task Name Column */}
              <div className="w-40 md:w-48 lg:w-64 flex-shrink-0 p-2 md:p-3 border-r border-gray-200 font-semibold text-gray-700 bg-gray-50 text-sm md:text-base">
                Görev
              </div>
              {/* Dates */}
              <div className="flex">
                {dates.map((date) => (
                  <div
                    key={date.toISOString()}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'flex-shrink-0 border-r border-gray-100 text-center py-2 cursor-pointer hover:bg-gray-50/70 transition-colors',
                      isToday(date) && 'bg-[#E5E7FF]',
                      !isSameMonth(date, anchorDate) && 'bg-gray-50/50'
                    )}
                    style={{ width: `${50 * zoom}px` }}
                    onDoubleClick={() => onAddTask?.(undefined, date)}
                  >
                    <div className="text-xs text-gray-500">
                      {format(date, 'EEE', { locale: tr })}
                    </div>
                    <div
                      className={cn(
                        'text-sm font-medium',
                        isToday(date) ? 'text-[#6161FF]' : 'text-gray-700'
                      )}
                    >
                      {format(date, 'd', { locale: tr })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Items */}
            <div ref={containerRef}>
              {timelineItems.map((item) => {
                const isDragging = dragState?.taskId === item.taskId;
                const effectiveStart = isDragging ? dragState!.startStartDate : item.startDate;
                const effectiveEnd = isDragging ? dragState!.startEndDate : item.endDate;
                const position = getItemPosition(effectiveStart, effectiveEnd);
                const dateBased = getElapsedRemaining(effectiveStart, effectiveEnd);
                const isDone = item.status === 'done';
                const elapsedRemaining = isDone
                  ? { elapsedPercent: 100, remainingPercent: 0 }
                  : dateBased;
                const statusLabel = isDone
                  ? 'Tamamlandı'
                  : elapsedRemaining.remainingPercent >= 100
                    ? 'Henüz başlamadı'
                    : elapsedRemaining.remainingPercent <= 0
                      ? 'Gecikmiş'
                      : `%${Math.round(elapsedRemaining.remainingPercent)} kaldı`;
                return (
                  <div
                    key={item.id}
                    className="flex border-b border-gray-100 bg-white hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Task Info */}
                    <div className="w-64 flex-shrink-0 px-3 py-2.5 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <button
                          type="button"
                          className="text-left text-sm font-medium text-gray-900 truncate hover:text-[#6161FF]"
                          onDoubleClick={() => onTaskClick(item.taskId)}
                        >
                          {item.title}
                        </button>
                      </div>
                      <div className="ml-4 mt-1 text-[11px] text-gray-500">
                        {statusLabel}
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative" style={{ height: '52px' }}>
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex">
                        {dates.map((date, i) => (
                          <div
                            key={i}
                            role="button"
                            tabIndex={0}
                            className="flex-shrink-0 border-r border-gray-100 h-full cursor-pointer hover:bg-[#E5E7FF]/30 transition-colors"
                            style={{ width: `${50 * zoom}px` }}
                            onDoubleClick={() => onAddTask?.(undefined, date)}
                          />
                        ))}
                      </div>

                      {/* Task Bar - görünür aralık dışındaysa gösterme */}
                      {position.visible ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center overflow-hidden transition-colors hover:bg-opacity-30',
                              onTaskDatesChange ? 'cursor-grab' : 'cursor-pointer',
                              dragState?.taskId === item.taskId && 'cursor-grabbing'
                            )}
                            onPointerDown={(e) => {
                              if (onTaskDatesChange) {
                                const barWidth = Math.max(position.width - 4, 28);
                                const mode = resolveDragMode(e.nativeEvent.offsetX, barWidth);
                                handleBarPointerDown(e, item, mode);
                              }
                            }}
                            onDoubleClick={() => onTaskClick(item.taskId)}
                            style={{
                              left: position.left + 2,
                              width: Math.max(position.width - 4, 28),
                              backgroundColor: `${item.color}1A`,
                              border: `1px solid ${item.color}44`,
                            }}
                          >
                            {onTaskDatesChange && (
                              <>
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize shrink-0 z-10"
                                  onPointerDown={(e) => { e.stopPropagation(); handleBarPointerDown(e, item, 'left'); }}
                                />
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize shrink-0 z-10"
                                  onPointerDown={(e) => { e.stopPropagation(); handleBarPointerDown(e, item, 'right'); }}
                                />
                              </>
                            )}
                            <div className="absolute left-1 right-1 bottom-1 h-1 rounded-full overflow-hidden flex">
                              <div
                                className="h-full transition-colors"
                                style={{
                                  width: `${elapsedRemaining.elapsedPercent}%`,
                                  backgroundColor: elapsedRemaining.elapsedPercent > 0 ? item.color : 'transparent',
                                }}
                              />
                              <div
                                className="h-full transition-colors"
                                style={{
                                  width: `${elapsedRemaining.remainingPercent}%`,
                                  backgroundColor: elapsedRemaining.remainingPercent > 0 ? 'rgba(156,163,175,0.6)' : 'transparent',
                                }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1 text-left">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-[11px] text-gray-300">
                              {item.assignee?.name ?? 'Atanmadı'} · {statusLabels[item.status]}
                            </div>
                            <div className="text-[11px] text-gray-300">
                              {format(effectiveStart, 'd MMM HH:mm', { locale: tr })} - {format(effectiveEnd, 'd MMM HH:mm', { locale: tr })}
                            </div>
                            <div className="text-[11px] text-gray-300">
                              {isDone
                                ? 'Tamamlandı'
                                : (() => {
                                    const { elapsedPercent, remainingPercent } = getElapsedRemaining(effectiveStart, effectiveEnd);
                                    if (remainingPercent >= 100) return 'Henüz başlamadı';
                                    if (elapsedPercent >= 100) return 'Gecikmiş';
                                    return `${Math.round(elapsedPercent)}% geçti · ${Math.round(remainingPercent)}% kaldı`;
                                  })()}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty Rows for Future Tasks */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`empty-${i}`}
                className={cn(
                  'flex border-b border-gray-100',
                  (timelineItems.length + i) % 2 === 0 && 'bg-white',
                  (timelineItems.length + i) % 2 === 1 && 'bg-gray-50/30'
                )}
                style={{ height: '52px' }}
              >
                <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200" />
                <div className="flex-1 relative">
                  <div className="absolute inset-0 flex">
                    {dates.map((date, j) => (
                      <div
                        key={j}
                        role="button"
                        tabIndex={0}
                        className="flex-shrink-0 border-r border-gray-100 h-full cursor-pointer hover:bg-[#E5E7FF]/30 transition-colors"
                        style={{ width: `${50 * zoom}px` }}
                        onDoubleClick={() => onAddTask?.(undefined, date)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
