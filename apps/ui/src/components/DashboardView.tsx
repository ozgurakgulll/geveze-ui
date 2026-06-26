import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { priorityColors, priorityLabels } from '@/data/mockData';
import { useUsers } from '@/contexts/UsersContext';
import type { Task } from '@/types';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getTaskProgress } from '@/lib/taskProgress';
import { getOverdueCalendarDaysFromDue, isTaskOverdue } from '@/lib/taskOverdue';

interface DashboardViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function DashboardView({ tasks, onTaskClick }: DashboardViewProps) {
  const users = useUsers();
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const revision = tasks.filter((t) => t.status === 'revision').length;
    const brief = tasks.filter((t) => t.status === 'brief').length;
    
    const highPriority = tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;

    const totalProgress =
      total > 0 ? tasks.reduce((acc, t) => acc + getTaskProgress(t), 0) / total : 0;

    return {
      total,
      done,
      inProgress,
      review,
      revision,
      brief,
      highPriority,
      overdue,
      totalProgress,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);
  }, [tasks]);

  const teamWorkload = useMemo(() => {
    return users.map((user) => {
      const userTasks = tasks.filter((t) => t.assignee?.id === user.id);
      const completed = userTasks.filter((t) => t.status === 'done').length;
      const inProgress = userTasks.filter((t) => t.status === 'in-progress').length;
      const total = userTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        user,
        total,
        completed,
        inProgress,
        progress,
      };
    });
  }, [tasks]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#6161FF] to-[#5050E0] text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Toplam İlerleme</p>
                  <h3 className="text-3xl font-bold mt-1">{Math.round(stats.totalProgress)}%</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <TrendingUp className="h-4 w-4" />
                <span>Geçen haftaya göre +12%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Tamamlanan Görev</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.done}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" />
                  {stats.completionRate}%
                </span>
                <span className="text-gray-500">tamamlanma oranı</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Devam Eden</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.inProgress}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-amber-600 font-medium">{stats.review}</span>
                <span className="text-gray-500">incelemede</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Yüksek Öncelik</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.highPriority}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-red-600 font-medium flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4" />
                  {stats.overdue}
                </span>
                <span className="text-gray-500">geciken görev</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Status Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#6161FF]" />
                Görev Durum Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Tamamlandı', count: stats.done, color: '#10B981', total: stats.total },
                  { label: 'Çalışılıyor', count: stats.inProgress, color: '#F59E0B', total: stats.total },
                  { label: 'İncelemede', count: stats.review, color: '#6366F1', total: stats.total },
                  { label: 'Revizyonda', count: stats.revision, color: '#EF4444', total: stats.total },
                  { label: 'Planlandı', count: stats.brief, color: '#64748B', total: stats.total },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{item.count}</span>
                        <span className="text-gray-500 w-10 text-right">
                          {item.total > 0 ? Math.round((item.count / item.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: item.total > 0 ? `${(item.count / item.total) * 100}%` : '0%',
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Workload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-[#6161FF]" />
                Ekip İş Yükü
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamWorkload.map((member) => (
                  <div key={member.user.id} className="flex items-center gap-3">
                    <Avatar
                      className="w-10 h-10"
                      style={{ backgroundColor: member.user.color }}
                    >
                      <AvatarFallback className="text-sm font-medium text-white">
                        {member.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {member.user.name}
                        </span>
                        <span className="text-xs text-gray-500">{member.total} görev</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#6161FF] transition-all duration-500"
                          style={{ width: `${member.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#6161FF]" />
                Son Aktiviteler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: priorityColors[task.priority] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Güncellendi {format(task.updatedAt, 'd MMM, HH:mm', { locale: tr })}
                      </p>
                    </div>
                    {task.assignee && (
                      <Avatar
                        className="w-6 h-6"
                        style={{ backgroundColor: task.assignee.color }}
                      >
                        <AvatarFallback className="text-[10px] text-white">
                          {task.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#6161FF]" />
                Yaklaşan Teslimler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks
                  .filter((t) => t.dueDate && t.status !== 'done')
                  .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
                  .slice(0, 5)
                  .map((task) => {
                    const now = new Date();
                    const overdue = isTaskOverdue(task, now);
                    const calToDue = task.dueDate
                      ? differenceInCalendarDays(startOfDay(task.dueDate), startOfDay(now))
                      : 0;
                    const overdueDays = getOverdueCalendarDaysFromDue(task, now);

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => onTaskClick(task.id)}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            overdue
                              ? 'bg-red-100 text-red-600'
                              : calToDue <= 2
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <p
                            className={`text-xs mt-0.5 ${
                              overdue
                                ? 'text-red-600 font-medium'
                                : calToDue <= 2
                                ? 'text-amber-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {overdue
                              ? `${overdueDays} gün gecikti`
                              : calToDue === 0
                              ? 'Bugün teslim'
                              : calToDue < 0
                              ? 'Son teslim günü'
                              : `${calToDue} gün kaldı`}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: `${priorityColors[task.priority]}20`,
                            color: priorityColors[task.priority],
                          }}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
