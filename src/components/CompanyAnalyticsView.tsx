import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { statusLabels, priorityLabels, priorityColors } from '@/data/mockData';
import type { Task, PortfolioCompany } from '@/types';
import { format, subDays, startOfDay } from 'date-fns';
import { isTaskOverdue } from '@/lib/taskOverdue';
import { tr } from 'date-fns/locale';

interface CompanyAnalyticsViewProps {
  company: PortfolioCompany;
  tasks: Task[];
  onBack: () => void;
  onTaskClick: (taskId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  brief: '#64748B',
  'in-progress': '#F59E0B',
  review: '#6366F1',
  revision: '#EF4444',
  done: '#10B981',
};

const STATUS_BADGE: Record<string, string> = {
  brief: 'bg-slate-100 text-slate-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  review: 'bg-indigo-100 text-indigo-700',
  revision: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
};

export function CompanyAnalyticsView({ company, tasks, onBack, onTaskClick }: CompanyAnalyticsViewProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const active = tasks.filter((t) => ['brief', 'in-progress', 'review', 'revision'].includes(t.status)).length;
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, active, overdue, completionRate };
  }, [tasks]);

  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = { brief: 0, 'in-progress': 0, review: 0, revision: 0, done: 0 };
    tasks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: statusLabels[key as keyof typeof statusLabels] ?? key,
        value,
        color: STATUS_COLORS[key] ?? '#94A3B8',
      }));
  }, [tasks]);

  const priorityBarData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasks.forEach((t) => { counts[t.priority]++; });
    return [
      { name: priorityLabels.low, value: counts.low, fill: priorityColors.low },
      { name: priorityLabels.medium, value: counts.medium, fill: priorityColors.medium },
      { name: priorityLabels.high, value: counts.high, fill: priorityColors.high },
      { name: priorityLabels.urgent, value: counts.urgent, fill: priorityColors.urgent },
    ];
  }, [tasks]);

  const teamWorkloadData = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    tasks.forEach((t) => {
      if (!t.assignee) return;
      const entry = map.get(t.assignee.id);
      if (entry) entry.count++;
      else map.set(t.assignee.id, { name: t.assignee.name, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tasks]);

  const tagData = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => t.tags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1)));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const trendData = useMemo(() => {
    const now = new Date();
    const days: { date: string; created: number; done: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const nextDay = startOfDay(subDays(now, i - 1));
      const label = format(day, 'd MMM', { locale: tr });
      const created = tasks.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= day && d < nextDay;
      }).length;
      const done = tasks.filter((t) => {
        if (t.status !== 'done') return false;
        const d = new Date(t.updatedAt);
        return d >= day && d < nextDay;
      }).length;
      days.push({ date: label, created, done });
    }
    return days;
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const order = ['in-progress', 'review', 'revision', 'brief', 'done'];
    order.forEach((s) => { groups[s] = []; });
    tasks.forEach((t) => {
      if (!groups[t.status]) groups[t.status] = [];
      groups[t.status].push(t);
    });
    return order
      .filter((s) => groups[s]?.length > 0)
      .map((status) => ({
        status,
        label: statusLabels[status as keyof typeof statusLabels] ?? status,
        tasks: groups[status].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      }));
  }, [tasks]);

  const TAG_COLORS = ['#6161FF', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6', '#F97316', '#64748B'];

  return (
    <ScrollArea className="h-full p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2 px-0 hover:bg-transparent" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {company.name} Detay Sayfası
            </Button>
            <h2 className="text-2xl font-semibold text-gray-900">{company.name} — Analitik</h2>
            <p className="text-sm text-gray-500 mt-1">Şirkete ait görevlerin detaylı analizi</p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Görev', value: stats.total, icon: <ListTodo className="h-5 w-5" />, bg: 'bg-[#6161FF]', textBg: 'text-white', iconBg: 'bg-white/20' },
            { label: 'Aktif', value: stats.active, icon: <Clock className="h-5 w-5 text-amber-500" />, bg: 'bg-white', textBg: '', iconBg: 'bg-amber-50' },
            { label: 'Geciken', value: stats.overdue, icon: <AlertTriangle className="h-5 w-5 text-red-500" />, bg: 'bg-white', textBg: '', iconBg: 'bg-red-50' },
            { label: 'Tamamlanan', value: `${stats.done} (${stats.completionRate}%)`, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, bg: 'bg-white', textBg: '', iconBg: 'bg-green-50' },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-0 shadow-sm ${kpi.bg}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${kpi.textBg ? 'text-white/70' : 'text-gray-500'}`}>{kpi.label}</p>
                    <h3 className={`text-2xl font-bold mt-1 ${kpi.textBg || 'text-gray-900'}`}>{kpi.value}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${kpi.iconBg}`}>
                    {kpi.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1: Status Pie + Priority Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Görev Durum Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Görev bulunamadı</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Öncelik Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {priorityBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Team Workload + Tag Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Ekip İş Yükü</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {teamWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamWorkloadData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Görev" fill="#6161FF" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Atama verisi bulunamadı</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Etiket Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {tagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Kullanım" radius={[6, 6, 0, 0]}>
                      {tagData.map((_, i) => (
                        <Cell key={i} fill={TAG_COLORS[i % TAG_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Etiket verisi bulunamadı</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Son 30 Gün — Görev Trendi</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" name="Oluşturulan" stroke="#6161FF" fill="#6161FF" fillOpacity={0.15} />
                <Area type="monotone" dataKey="done" name="Tamamlanan" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task List grouped by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Görev Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            {groupedTasks.length > 0 ? (
              <div className="space-y-5">
                {groupedTasks.map((group) => (
                  <div key={group.status}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[group.status] ?? '#94A3B8' }}
                      />
                      <h4 className="text-sm font-semibold text-gray-700">{group.label}</h4>
                      <Badge variant="secondary" className="text-[10px]">{group.tasks.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {group.tasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="w-full flex items-center gap-3 rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50 transition-colors text-left"
                          onDoubleClick={() => onTaskClick(task.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.dueDate && (
                                <span className={`text-xs ${isTaskOverdue(task) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                  Teslim: {format(new Date(task.dueDate), 'd MMM yyyy', { locale: tr })}
                                </span>
                              )}
                              {task.tags.length > 0 && (
                                <span className="text-xs text-gray-300">
                                  {task.tags.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          {task.assignee && (
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="text-[10px] bg-[#6161FF]/10 text-[#6161FF]">
                                {task.assignee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <Badge className={`shrink-0 text-[10px] px-1.5 py-0.5 ${STATUS_BADGE[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[task.status as keyof typeof statusLabels] ?? task.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Bu şirkete atanmış görev bulunmuyor.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
