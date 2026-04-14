import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { priorityColors } from '@/data/mockData';
import type { Task } from '@/types';

interface CalendarViewProps {
  tasks: Task[];
  onAddTask: (columnId?: string, dueDate?: Date, assigneeId?: string) => void;
  onTaskClick: (taskId: string) => void;
  selectedAssigneeId?: string;
}

export function CalendarView({ tasks, onAddTask, onTaskClick, selectedAssigneeId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const matchesDate = task.dueDate ? isSameDay(task.dueDate, date) : false;
      const matchesAssignee = selectedAssigneeId ? task.assignee?.id === selectedAssigneeId : true;
      return matchesDate && matchesAssignee;
    });
  };

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Bugün
          </Button>
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium text-lg">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </span>
          </div>
        </div>

        <Button
          className="gap-2 bg-[#6161FF] hover:bg-[#5050E0]"
          onClick={() => onAddTask()}
        >
          <Plus className="h-4 w-4" />
          Etkinlik Ekle
        </Button>
      </div>

      {/* Calendar Grid + Selected Date - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 md:p-6">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-gray-50 py-2 px-3 text-center text-sm font-medium text-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
            {days.map((day) => {
              const tasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  onDoubleClick={() => onAddTask(undefined, day, selectedAssigneeId)}
                  className={cn(
                    'min-h-[80px] md:min-h-[120px] bg-white p-1.5 md:p-2 cursor-pointer transition-colors hover:bg-gray-50',
                    !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
                    isTodayDate && 'bg-[#E5E7FF]/30',
                    isSelected && 'ring-2 ring-inset ring-[#6161FF]'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                        isTodayDate
                          ? 'bg-[#6161FF] text-white'
                          : isCurrentMonth
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd', { locale: tr })}
                    </span>
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {tasks.length}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    {tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="text-xs p-1.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(task.id);
                        }}
                        style={{
                          backgroundColor: `${priorityColors[task.priority]}15`,
                          borderLeft: `3px solid ${priorityColors[task.priority]}`,
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{tasks.length - 3} tane daha
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Tasks */}
        {selectedDate && (
          <div className="px-4 md:px-6 pb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'd MMMM yyyy', { locale: tr })} görevleri
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => onAddTask(undefined, selectedDate, selectedAssigneeId)}
                  >
                    <Plus className="h-4 w-4" />
                    Görev Ekle
                  </Button>
                </div>
                <div className="space-y-2">
                  {getTasksForDate(selectedDate).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Bu tarih için görev yok</p>
                  ) : (
                    getTasksForDate(selectedDate).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        onDoubleClick={() => onTaskClick(task.id)}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: priorityColors[task.priority] }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500">{task.description}</p>
                          )}
                        </div>
                        {task.assignee && (
                          <Avatar
                            className="w-8 h-8"
                            style={{ backgroundColor: task.assignee.color }}
                          >
                            <AvatarFallback className="text-xs text-white">
                              {task.assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
