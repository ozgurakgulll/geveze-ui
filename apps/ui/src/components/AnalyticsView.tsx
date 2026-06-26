import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
  Users,
  Film,
  FileText,
  ImageIcon,
  Box,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import { priorityColors, priorityLabels, statusLabels } from '@/data/mockData';
import { useUsers } from '@/contexts/UsersContext';
import type { Task, PortfolioCompany } from '@/types';
import { getTaskProgress } from '@/lib/taskProgress';
import { getOverdueCalendarDaysFromDue, isTaskOverdue } from '@/lib/taskOverdue';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AnalyticsViewProps {
  tasks: Task[];
  companies: PortfolioCompany[];
  serviceTypes?: string[];
  onTaskClick: (taskId: string) => void;
  onPersonSelect?: (personId: string) => void;
  onCompanySelect?: (companyId: string) => void;
}

const DEFAULT_SERVICE_TYPES: string[] = [
  'Video Prodüksiyon',
  'Sosyal Medya Yönetimi',
  'Performance Marketing',
  'Grafik Tasarım',
  'İçerik Yazarlığı',
  'Web Geliştirme',
  'SEO',
  'Influencer Marketing',
  'Kurumsal Kimlik',
  'İç Projeler',
];

const STATUS_COLORS: Record<string, string> = {
  brief: '#64748B',
  'in-progress': '#F59E0B',
  review: '#6366F1',
  revision: '#EF4444',
  done: '#10B981',
};

const PORTFOLIO_STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  'on-hold': '#F59E0B',
  left: '#94A3B8',
};

const PORTFOLIO_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  'on-hold': 'Beklemede',
  left: 'Ayrıldı',
};

const CONTENT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planlandı',
  'in-production': 'Üretimde',
  published: 'Yayında',
};

const CONTENT_STATUS_COLORS: Record<string, string> = {
  planned: '#64748B',
  'in-production': '#F59E0B',
  published: '#10B981',
};

function KpiCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  gradient?: boolean;
}) {
  return (
    <Card className={gradient ? 'bg-gradient-to-br from-[#6161FF] to-[#5050E0] text-white border-0' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${gradient ? 'text-white/70' : 'text-gray-500'}`}>{title}</p>
            <h3 className={`text-2xl font-bold mt-1 ${gradient ? '' : 'text-gray-900'}`}>{value}</h3>
          </div>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${gradient ? 'bg-white/20' : 'bg-gray-100'}`}>
            {icon}
          </div>
        </div>
        {(subtitle || trend) && (
          <div className={`mt-3 flex items-center gap-2 text-xs ${gradient ? 'text-white/70' : 'text-gray-500'}`}>
            {trend && (
              <span className={`font-medium flex items-center gap-0.5 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ tasks, companies, onTaskClick }: { tasks: Task[]; companies: PortfolioCompany[]; onTaskClick?: (id: string) => void }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const revision = tasks.filter((t) => t.status === 'revision').length;
    const brief = tasks.filter((t) => t.status === 'brief').length;
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
    const avgProgress = total > 0 ? Math.round(tasks.reduce((a, t) => a + getTaskProgress(t), 0) / total) : 0;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const activeCompanies = companies.filter((c) => c.status === 'active').length;
    return { total, done, inProgress, review, revision, brief, overdue, avgProgress, completionRate, activeCompanies };
  }, [tasks, companies]);

  const statusPieData = useMemo(() => [
    { name: statusLabels.brief, value: stats.brief, color: STATUS_COLORS.brief },
    { name: statusLabels['in-progress'], value: stats.inProgress, color: STATUS_COLORS['in-progress'] },
    { name: statusLabels.review, value: stats.review, color: STATUS_COLORS.review },
    { name: statusLabels.revision, value: stats.revision, color: STATUS_COLORS.revision },
    { name: statusLabels.done, value: stats.done, color: STATUS_COLORS.done },
  ], [stats]);

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

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter((t) => isTaskOverdue(t))
        .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)),
    [tasks]
  );

  const weeklyActivity = useMemo(() => {
    const now = new Date();
    const weeks: { name: string; created: number; updated: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const label = `${format(weekStart, 'd MMM', { locale: tr })}`;
      const created = tasks.filter((t) => t.createdAt >= weekStart && t.createdAt < weekEnd).length;
      const updated = tasks.filter((t) => t.updatedAt >= weekStart && t.updatedAt < weekEnd).length;
      weeks.push({ name: label, created, updated });
    }
    return weeks;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Toplam Görev" value={stats.total} icon={<Target className="h-5 w-5 text-[#6161FF]" />} gradient />
        <KpiCard title="Tamamlanma" value={`${stats.completionRate}%`} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} trend={{ value: `${stats.done} görev`, positive: true }} />
        <KpiCard title="Aktif Görev" value={stats.inProgress + stats.review + stats.revision} icon={<Clock className="h-5 w-5 text-amber-500" />} subtitle="çalışılıyor + inceleme" />
        <KpiCard title="Geciken" value={stats.overdue} icon={<AlertCircle className="h-5 w-5 text-red-500" />} trend={stats.overdue > 0 ? { value: `${stats.overdue} görev`, positive: false } : undefined} />
        <KpiCard title="Ort. İlerleme" value={`${stats.avgProgress}%`} icon={<TrendingUp className="h-5 w-5 text-[#6161FF]" />} />
        <KpiCard title="Aktif Şirket" value={stats.activeCompanies} icon={<Building2 className="h-5 w-5 text-[#6161FF]" />} subtitle={`${companies.length} toplam`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Görev Durum Dağılımı</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusPieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Öncelik Dağılımı</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {priorityBarData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Haftalık Aktivite</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" name="Oluşturulan" stroke="#6161FF" fill="#6161FF" fillOpacity={0.15} />
                <Area type="monotone" dataKey="updated" name="Güncellenen" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold flex items-center justify-between">Geciken Görevler <Badge variant="secondary" className="text-xs">{overdueTasks.length}</Badge></CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Geciken görev yok.</p>
              ) : (
                overdueTasks.map((task) => {
                  const days = getOverdueCalendarDaysFromDue(task);
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onTaskClick?.(task.id)}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[task.priority] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-red-500 font-medium">{days} gün gecikti</p>
                      </div>
                      {task.assignee && (
                        <Avatar className="w-6 h-6 flex-shrink-0" style={{ backgroundColor: task.assignee.color }}>
                          <AvatarFallback className="text-[9px] text-white">{task.assignee.initials}</AvatarFallback>
                        </Avatar>
                      )}
                      <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority] }}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamTab({ tasks, companies, onPersonSelect }: { tasks: Task[]; companies: PortfolioCompany[]; onPersonSelect?: (personId: string) => void }) {
  const users = useUsers();
  const teamData = useMemo(() =>
    users.map((user) => {
      const ut = tasks.filter((t) => t.assignee?.id === user.id);
      const done = ut.filter((t) => t.status === 'done').length;
      const active = ut.filter((t) => t.status !== 'done' && t.status !== 'brief').length;
      const overdue = ut.filter((t) => isTaskOverdue(t)).length;
      const total = ut.length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
      const assignedCompanies = companies.filter((c) => c.assignedTeamMemberIds.includes(user.id)).length;
      return { user, total, done, active, overdue, completionRate, assignedCompanies };
    }),
  [tasks, companies]);

  const radarData = useMemo(() =>
    teamData.map((m) => ({
      name: m.user.name.split(' ')[0],
      'Toplam İş': m.total,
      'Aktif İş': m.active,
      Tamamlanan: m.done,
      Geciken: m.overdue,
    })),
  [teamData]);

  const completionRaceData = useMemo(() =>
    [...teamData]
      .sort((a, b) => b.completionRate - a.completionRate)
      .map((m) => ({
        name: m.user.name.split(' ')[0],
        value: m.completionRate,
        fill: m.user.color,
      })),
  [teamData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamData.map((m) => (
          <Card
            key={m.user.id}
            className={onPersonSelect ? 'cursor-pointer hover:ring-2 hover:ring-[#6161FF]/30 transition-shadow' : ''}
            onClick={onPersonSelect ? () => onPersonSelect(m.user.id) : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10" style={{ backgroundColor: m.user.color }}>
                  <AvatarFallback className="text-sm text-white font-medium">{m.user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.user.name}</p>
                  <p className="text-xs text-gray-500">{m.user.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{m.total}</p>
                  <p className="text-[10px] text-gray-500">Toplam</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-500">{m.active}</p>
                  <p className="text-[10px] text-gray-500">Aktif</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-500">{m.overdue}</p>
                  <p className="text-[10px] text-gray-500">Geciken</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-500">{m.done}</p>
                  <p className="text-[10px] text-gray-500">Biten</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Tamamlanma</span>
                  <span className="font-semibold text-gray-700">{m.completionRate}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.completionRate}%`, backgroundColor: m.user.color }} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="h-3 w-3" />
                <span>{m.assignedCompanies} şirket atanmış</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Ekip İş Yükü Karşılaştırması</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                <Radar name="Toplam İş" dataKey="Toplam İş" stroke="#6161FF" fill="#6161FF" fillOpacity={0.15} />
                <Radar name="Aktif İş" dataKey="Aktif İş" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                <Radar name="Tamamlanan" dataKey="Tamamlanan" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Tamamlanma Oranı Sıralaması</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionRaceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {completionRaceData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompanyTab({ tasks, companies, serviceTypes, onCompanySelect }: { tasks: Task[]; companies: PortfolioCompany[]; serviceTypes: string[]; onCompanySelect?: (companyId: string) => void }) {
  const users = useUsers();
  const [sortField, setSortField] = useState<'name' | 'services' | 'quota'>('quota');

  const allServicesForChart = useMemo(() => {
    const fromTypes = serviceTypes.length > 0 ? serviceTypes : DEFAULT_SERVICE_TYPES;
    const fromCompanies = companies.flatMap((c) => c.servicesTaken);
    return [...new Set([...fromTypes, ...fromCompanies])];
  }, [serviceTypes, companies]);

  const portfolioStatusData = useMemo(() => {
    const counts: Record<string, number> = { active: 0, 'on-hold': 0, left: 0 };
    companies.forEach((c) => { counts[c.status]++; });
    return Object.entries(counts).map(([key, value]) => ({
      name: PORTFOLIO_STATUS_LABELS[key],
      value,
      color: PORTFOLIO_STATUS_COLORS[key],
    }));
  }, [companies]);

  const serviceUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    allServicesForChart.forEach((s) => { counts[s] = 0; });
    companies.forEach((c) => c.servicesTaken.forEach((s) => { counts[s]++; }));
    return allServicesForChart
      .map((s) => ({ name: s, value: counts[s] }))
      .sort((a, b) => b.value - a.value);
  }, [companies, allServicesForChart]);

  const companyTableData = useMemo(() => {
    const data = companies.map((c) => {
      const totalQuota = c.monthlyQuotas.video + c.monthlyQuotas.post + c.monthlyQuotas.story;
      const assignedUsers = users.filter((u) => c.assignedTeamMemberIds.includes(u.id));
      const relatedTasks = tasks.filter((t) => t.portfolioCompanyId === c.id);
      return { ...c, totalQuota, assignedUsers, taskCount: relatedTasks.length };
    });
    return [...data].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name, 'tr');
      if (sortField === 'services') return b.servicesTaken.length - a.servicesTaken.length;
      return b.totalQuota - a.totalQuota;
    });
  }, [companies, tasks, sortField]);

  const churnData = useMemo(() => {
    const left = companies.filter((c) => c.status === 'left');
    const churnRate = companies.length > 0 ? Math.round((left.length / companies.length) * 100) : 0;
    return { left, churnRate };
  }, [companies]);

  const topCompanies = useMemo(() =>
    [...companies]
      .filter((c) => c.status === 'active')
      .sort((a, b) => {
        const aQ = a.monthlyQuotas.video + a.monthlyQuotas.post + a.monthlyQuotas.story;
        const bQ = b.monthlyQuotas.video + b.monthlyQuotas.post + b.monthlyQuotas.story;
        return bQ - aQ;
      })
      .slice(0, 5),
  [companies]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Toplam Şirket" value={companies.length} icon={<Building2 className="h-5 w-5 text-[#6161FF]" />} gradient />
        <KpiCard title="Aktif" value={portfolioStatusData.find((d) => d.name === 'Aktif')?.value ?? 0} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
        <KpiCard title="Beklemede" value={portfolioStatusData.find((d) => d.name === 'Beklemede')?.value ?? 0} icon={<Clock className="h-5 w-5 text-amber-500" />} />
        <KpiCard title="Churn Oranı" value={`${churnData.churnRate}%`} icon={<AlertCircle className="h-5 w-5 text-red-500" />} trend={churnData.churnRate > 15 ? { value: `${churnData.left.length} ayrıldı`, positive: false } : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Portföy Durum Dağılımı</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={portfolioStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {portfolioStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Hizmet Kullanım Sıklığı</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceUsageData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6161FF" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Şirket Detay Tablosu</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sırala:</span>
              <select
                className="h-7 rounded-md border border-gray-200 px-2 text-xs"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as typeof sortField)}
              >
                <option value="quota">Kota</option>
                <option value="services">Hizmet Sayısı</option>
                <option value="name">İsim</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Şirket</th>
                  <th className="py-2 pr-3 font-medium">Durum</th>
                  <th className="py-2 pr-3 font-medium">Hizmetler</th>
                  <th className="py-2 pr-3 font-medium text-right">Aylık Kota</th>
                  <th className="py-2 font-medium">Ekip</th>
                </tr>
              </thead>
              <tbody>
                {companyTableData.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${onCompanySelect ? 'cursor-pointer' : ''}`}
                    onClick={onCompanySelect ? () => onCompanySelect(c.id) : undefined}
                  >
                    <td className="py-2 pr-3 font-medium text-gray-900 truncate max-w-[200px]">{c.name}</td>
                    <td className="py-2 pr-3">
                      <Badge className="text-[10px]" style={{ backgroundColor: `${PORTFOLIO_STATUS_COLORS[c.status]}20`, color: PORTFOLIO_STATUS_COLORS[c.status] }}>
                        {PORTFOLIO_STATUS_LABELS[c.status]}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600">{c.servicesTaken.length} hizmet</td>
                    <td className="py-2 pr-3 text-xs text-right text-gray-700 font-medium">{c.totalQuota}</td>
                    <td className="py-2">
                      <div className="flex -space-x-1.5">
                        {c.assignedUsers.map((u) => (
                          <Avatar key={u.id} className="w-5 h-5 border border-white" style={{ backgroundColor: u.color }}>
                            <AvatarFallback className="text-[8px] text-white">{u.initials}</AvatarFallback>
                          </Avatar>
                        ))}
                        {c.assignedUsers.length === 0 && <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">En Yoğun 5 Şirket (Aylık Kota)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCompanies.map((c, i) => {
                const total = c.monthlyQuotas.video + c.monthlyQuotas.post + c.monthlyQuotas.story;
                const maxQuota = topCompanies[0] ? topCompanies[0].monthlyQuotas.video + topCompanies[0].monthlyQuotas.post + topCompanies[0].monthlyQuotas.story : 1;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{total} içerik/ay</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#6161FF]" style={{ width: `${(total / maxQuota) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Kaybedilen Müşteriler ({churnData.left.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {churnData.left.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Ayrılan müşteri yok.</p>
              ) : (
                churnData.left.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.exitDate ? format(new Date(c.exitDate), 'd MMM yyyy', { locale: tr }) : '-'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.servicesTaken.slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContentTab({ companies, serviceTypes }: { companies: PortfolioCompany[]; serviceTypes: string[] }) {
  const activeCompanies = useMemo(() => companies.filter((c) => c.status === 'active'), [companies]);

  const allServicesForChart = useMemo(() => {
    const fromTypes = serviceTypes.length > 0 ? serviceTypes : DEFAULT_SERVICE_TYPES;
    const fromCompanies = companies.flatMap((c) => c.servicesTaken);
    return [...new Set([...fromTypes, ...fromCompanies])];
  }, [serviceTypes, companies]);

  const quotaTotals = useMemo(() => {
    let video = 0, post = 0, story = 0, render3d = 0;
    activeCompanies.forEach((c) => {
      video += c.monthlyQuotas.video;
      post += c.monthlyQuotas.post;
      story += c.monthlyQuotas.story;
      if ('render3d' in c.monthlyQuotas) render3d += (c.monthlyQuotas as { render3d?: number }).render3d ?? 0;
    });
    return { video, post, story, render3d };
  }, [activeCompanies]);

  const companyQuotaChart = useMemo(() =>
    activeCompanies
      .map((c) => ({
        name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
        Video: c.monthlyQuotas.video,
        Gönderi: c.monthlyQuotas.post,
        Hikaye: c.monthlyQuotas.story,
      }))
      .sort((a, b) => (b.Video + b.Gönderi + b.Hikaye) - (a.Video + a.Gönderi + a.Hikaye))
      .slice(0, 12),
  [activeCompanies]);

  const calendarStatusData = useMemo(() => {
    const counts: Record<string, number> = { planned: 0, 'in-production': 0, published: 0 };
    companies.forEach((c) => c.monthlyContentCalendar.forEach((item) => { counts[item.status]++; }));
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: CONTENT_STATUS_LABELS[key],
        value,
        color: CONTENT_STATUS_COLORS[key],
      }));
  }, [companies]);

  const activeServiceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allServicesForChart.forEach((s) => { counts[s] = 0; });
    activeCompanies.forEach((c) => c.servicesTaken.forEach((s) => { counts[s]++; }));
    return allServicesForChart
      .map((s) => ({ name: s, value: counts[s] }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeCompanies, allServicesForChart]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Aylık Video" value={quotaTotals.video} icon={<Film className="h-5 w-5 text-[#6161FF]" />} gradient subtitle={`${activeCompanies.length} aktif şirket`} />
        <KpiCard title="Aylık Gönderi" value={quotaTotals.post} icon={<ImageIcon className="h-5 w-5 text-green-600" />} subtitle="toplam post kotası" />
        <KpiCard title="Aylık Hikaye" value={quotaTotals.story} icon={<FileText className="h-5 w-5 text-amber-500" />} subtitle="toplam story kotası" />
        <KpiCard title="3D Render" value={quotaTotals.render3d} icon={<Box className="h-5 w-5 text-purple-500" />} subtitle="aylık render kotası" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">Şirket Bazlı İçerik Karşılaştırması (İlk 12)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={companyQuotaChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Video" stackId="a" fill="#6161FF" />
              <Bar dataKey="Gönderi" stackId="a" fill="#10B981" />
              <Bar dataKey="Hikaye" stackId="a" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">İçerik Takvimi Durumu</CardTitle></CardHeader>
          <CardContent className="h-72">
            {calendarStatusData.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">İçerik takvimi verisi yok.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calendarStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {calendarStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Aktif Hizmet Dağılımı</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeServiceBreakdown} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsView({ tasks, companies, serviceTypes = [], onTaskClick, onPersonSelect, onCompanySelect }: AnalyticsViewProps) {
  const effectiveServiceTypes = serviceTypes.length > 0 ? serviceTypes : DEFAULT_SERVICE_TYPES;
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6161FF] to-[#5050E0] flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analitik</h1>
            <p className="text-sm text-gray-500">Görev, ekip ve portföy performans verileri</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Ekip
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Şirketler
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              <Film className="h-3.5 w-3.5" />
              İçerik Üretimi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab tasks={tasks} companies={companies} onTaskClick={onTaskClick} />
          </TabsContent>
          <TabsContent value="team">
            <TeamTab tasks={tasks} companies={companies} onPersonSelect={onPersonSelect} />
          </TabsContent>
          <TabsContent value="company">
            <CompanyTab tasks={tasks} companies={companies} serviceTypes={effectiveServiceTypes} onCompanySelect={onCompanySelect} />
          </TabsContent>
          <TabsContent value="content">
            <ContentTab companies={companies} serviceTypes={effectiveServiceTypes} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
