import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  TrendingUp,
  Upload,
  User as UserIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PRIORITY_COLORS as priorityColors, STATUS_LABELS as statusLabels } from '@/lib/constants';
import { isTaskOverdue } from '@/lib/taskOverdue';
import type { PortfolioCompany, Task, User } from '@/types';
import {
  addDays,
  differenceInDays,
  format,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface PersonViewProps {
  user: User;
  tasks: Task[];
  companies: PortfolioCompany[];
  onTaskClick: (taskId: string) => void;
  onCompanySelect: (companyId: string) => void;
  onBack?: () => void;
}

const COMPANY_STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  'on-hold': '#F59E0B',
  left: '#EF4444',
};

const COMPANY_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  'on-hold': 'Beklemede',
  left: 'Ayrıldı',
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Sec({
  title,
  icon,
  badge,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`h-full ${className ?? ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
            {badge}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export function PersonView({
  user,
  tasks,
  companies,
  onTaskClick,
  onCompanySelect,
  onBack,
}: PersonViewProps) {
  const [taskTab, setTaskTab] = useState<string>('active');

  const userTasks = useMemo(
    () => tasks.filter((t) => t.assignee?.id === user.id),
    [tasks, user.id],
  );

  const assignedCompanies = useMemo(
    () => companies.filter((c) => c.assignedTeamMemberIds.includes(user.id)),
    [companies, user.id],
  );

  const now = useMemo(() => new Date(), []);
  const sevenDaysLater = useMemo(() => addDays(now, 7), [now]);

  const activeTasks = useMemo(
    () => userTasks.filter((t) => t.status !== 'done'),
    [userTasks],
  );

  const overdueTasks = useMemo(
    () => userTasks.filter((t) => isTaskOverdue(t, now)),
    [userTasks, now],
  );

  const upcomingTasks = useMemo(
    () =>
      userTasks.filter(
        (t) =>
          t.dueDate &&
          t.status !== 'done' &&
          t.dueDate >= now &&
          t.dueDate <= sevenDaysLater,
      ),
    [userTasks, now, sevenDaysLater],
  );

  const completedTasks = useMemo(
    () => userTasks.filter((t) => t.status === 'done'),
    [userTasks],
  );

  const tabTasks = useMemo(() => {
    switch (taskTab) {
      case 'overdue':
        return overdueTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'completed':
        return completedTasks;
      default:
        return activeTasks;
    }
  }, [taskTab, activeTasks, overdueTasks, upcomingTasks, completedTasks]);

  const onTimeRate = useMemo(() => {
    const doneWithDue = completedTasks.filter((t) => t.dueDate);
    if (doneWithDue.length === 0) return 0;
    const onTime = doneWithDue.filter((t) => t.updatedAt <= t.dueDate!).length;
    return Math.round((onTime / doneWithDue.length) * 100);
  }, [completedTasks]);

  const monthlyTrend = useMemo(() => {
    const months: { name: string; count: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const ms = startOfMonth(subMonths(now, i));
      const me = endOfMonth(subMonths(now, i));
      const count = completedTasks.filter((t) =>
        isWithinInterval(t.updatedAt, { start: ms, end: me }),
      ).length;
      months.push({ name: format(ms, 'MMM yyyy', { locale: tr }), count });
    }
    return months;
  }, [completedTasks, now]);

  const avgDeliveryDays = useMemo(() => {
    const doneWithDates = completedTasks.filter((t) => t.createdAt && t.updatedAt);
    if (doneWithDates.length === 0) return 0;
    const total = doneWithDates.reduce(
      (sum, t) => sum + Math.max(0, differenceInDays(t.updatedAt, t.createdAt)),
      0,
    );
    return Math.round(total / doneWithDates.length);
  }, [completedTasks]);

  const estimatedStartDate = useMemo(() => {
    if (assignedCompanies.length === 0) return null;
    return assignedCompanies.reduce(
      (min, c) => (c.startDate < min ? c.startDate : min),
      assignedCompanies[0].startDate,
    );
  }, [assignedCompanies]);

  const tenureDays = useMemo(() => {
    if (!estimatedStartDate) return 0;
    return Math.max(0, differenceInDays(now, new Date(estimatedStartDate)));
  }, [estimatedStartDate, now]);

  const rng = useMemo(
    () => seededRandom(user.id.charCodeAt(0) * 1000 + user.id.length),
    [user.id],
  );

  const { isOnline, lastSeenLabel } = useMemo(() => {
    if (!user.lastActiveAt) {
      return { isOnline: false, lastSeenLabel: 'Son aktiflik bilinmiyor' };
    }
    const diffMs = now.getTime() - new Date(user.lastActiveAt).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const online = diffMin < 5;
    let label = '';
    if (!online) {
      if (diffMin < 60) label = `${diffMin} dk önce görüldü`;
      else if (diffMin < 1440) label = `${Math.floor(diffMin / 60)} sa önce görüldü`;
      else label = `${Math.floor(diffMin / 1440)} gün önce görüldü`;
    }
    return { isOnline: online, lastSeenLabel: label };
  }, [user.lastActiveAt, now]);

  const weeklyHours = useMemo(() => {
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    return days.map((day) => ({ day, hours: +(rng() * 6 + 4).toFixed(1) }));
  }, [rng]);

  const companyNotes = useMemo(() => {
    const notes: {
      date: string;
      author: string;
      note: string;
      company: string;
    }[] = [];
    for (const company of assignedCompanies) {
      for (const log of company.activityLog.slice(-3)) {
        notes.push({
          date: log.date,
          author: log.author,
          note: log.note,
          company: company.name,
        });
      }
    }
    return notes
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [assignedCompanies]);

  const weeklyUpdatedCount = useMemo(() => {
    const weekAgo = addDays(now, -7);
    return userTasks.filter((t) => t.updatedAt >= weekAgo).length;
  }, [userTasks, now]);

  const kpiItems = [
    { key: 'active', label: 'Aktif Görev', value: activeTasks.length, color: '#F59E0B', icon: Clock },
    { key: 'overdue', label: 'Geciken', value: overdueTasks.length, color: '#EF4444', icon: AlertCircle },
    { key: 'companies', label: 'Şirket', value: assignedCompanies.length, color: '#6161FF', icon: Building2 },
    { key: 'completed', label: 'Tamamlanan', value: completedTasks.length, color: '#10B981', icon: CheckCircle2 },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">
        {/* ──── HEADER ──── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 px-0 hover:bg-transparent text-gray-500"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Ekip
              </Button>
            )}
            <Avatar
              className="w-12 h-12 shrink-0 ring-2 ring-gray-100"
              style={{ backgroundColor: user.color }}
            >
              <AvatarFallback className="text-sm font-semibold text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
                {user.name}
              </h2>
              <div className="flex items-center gap-2.5 mt-1">
                <Badge
                  className="text-[11px] shrink-0"
                  style={{
                    backgroundColor: isOnline ? '#D1FAE5' : '#FEF3C7',
                    color: isOnline ? '#065F46' : '#92400E',
                    border: 'none',
                  }}
                >
                  {isOnline ? 'Aktif' : 'Çevrimdışı'}
                </Badge>
                <span className="text-xs text-gray-400 truncate">
                  {user.title ?? ''}
                  {user.title && ' · '}
                  {user.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ──── KPI STAT BAR ──── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiItems.map(({ key, label, value, color, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ──── ROW 1: Profil | Atanan Şirketler | Görevler ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Sec
            title="Profil Bilgileri"
            icon={<UserIcon className="h-3.5 w-3.5" />}
          >
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto overscroll-contain pr-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Unvan</span>
                <span className="font-medium text-gray-800">{user.title ?? '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">E-posta</span>
                <span className="font-medium text-gray-800 truncate ml-2">{user.email}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Çalışma</span>
                <span className="font-medium text-gray-800">Tam Zamanlı</span>
              </div>
              {estimatedStartDate && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Başlangıç</span>
                    <span className="font-medium text-gray-800">
                      {format(new Date(estimatedStartDate), 'd MMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Kıdem</span>
                    <span className="font-medium text-gray-800">{tenureDays} gün</span>
                  </div>
                </>
              )}
            </div>
          </Sec>

          <Sec
            title="Atanan Şirketler"
            icon={<Building2 className="h-3.5 w-3.5" />}
            badge={
              assignedCompanies.length > 0 ? (
                <Badge variant="secondary" className="text-[9px]">
                  {assignedCompanies.length}
                </Badge>
              ) : undefined
            }
          >
            {assignedCompanies.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Atanmış şirket yok.</p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto overscroll-contain pr-1">
                {assignedCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 hover:border-[#6161FF]/30 transition-colors"
                    onClick={() => onCompanySelect(company.id)}
                  >
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {company.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] shrink-0"
                      style={{
                        backgroundColor: `${COMPANY_STATUS_COLORS[company.status]}15`,
                        color: COMPANY_STATUS_COLORS[company.status],
                      }}
                    >
                      {COMPANY_STATUS_LABELS[company.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Sec>

          <Sec title="Görevler" icon={<Clock className="h-3.5 w-3.5" />}>
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { key: 'active', label: 'Aktif', count: activeTasks.length },
                { key: 'overdue', label: 'Geciken', count: overdueTasks.length },
                { key: 'upcoming', label: 'Yaklaşan', count: upcomingTasks.length },
                { key: 'completed', label: 'Tamamlanan', count: completedTasks.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskTab(key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    taskTab === key
                      ? 'border-[#6161FF] bg-[#E5E7FF]/60 text-[#4040c8]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto overscroll-contain pr-1">
              {tabTasks.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  Bu kategoride görev yok.
                </p>
              ) : (
                tabTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <div
                      className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: priorityColors[task.priority] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {task.portfolioCompanyName && (
                          <Badge variant="secondary" className="text-[9px]">
                            {task.portfolioCompanyName}
                          </Badge>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {statusLabels[task.status]}
                          {task.dueDate &&
                            ` · ${format(task.dueDate, 'd MMM', { locale: tr })}`}
                        </span>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-10 shrink-0">
                          <Progress value={task.progress} className="h-1.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>%{task.progress}</TooltipContent>
                    </Tooltip>
                  </div>
                ))
              )}
            </div>
          </Sec>
        </div>

        {/* ──── ROW 2: Notlar | Performans | Aktivite & Saatler ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Sec
            title="Notlar"
            icon={<FileText className="h-3.5 w-3.5" />}
            badge={
              companyNotes.length > 0 ? (
                <Badge variant="secondary" className="text-[9px]">
                  {companyNotes.length}
                </Badge>
              ) : undefined
            }
          >
            {companyNotes.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Henüz not yok.</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {companyNotes.map((note, i) => (
                  <div
                    key={i}
                    className="text-xs border-l-2 border-[#6161FF]/30 pl-2.5 py-1"
                  >
                    <p className="text-gray-800">{note.note}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {format(new Date(note.date), 'd MMM', { locale: tr })} · {note.company}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Sec>

          <Sec title="Performans" icon={<TrendingUp className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg bg-gray-50 p-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{avgDeliveryDays} gün</p>
                <p className="text-[10px] text-gray-500">Ort. Teslim</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 text-center">
                <p
                  className="text-lg font-bold"
                  style={{
                    color:
                      onTimeRate >= 70 ? '#10B981' : onTimeRate >= 40 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  %{onTimeRate}
                </p>
                <p className="text-[10px] text-gray-500">Zamanında</p>
              </div>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id={`grad-${user.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6161FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6161FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6161FF"
                    fill={`url(#grad-${user.id})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Sec>

          <Sec title="Aktivite & Saatler" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-800">
                  {isOnline ? 'Çevrimiçi' : lastSeenLabel}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                Bu hafta {weeklyUpdatedCount} görev güncellendi
              </p>
              <Separator />
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} domain={[0, 12]} width={24} />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="#6161FF" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-gray-500">
                Günlük ortalama:{' '}
                <span className="font-semibold text-gray-800">
                  {(weeklyHours.reduce((s, d) => s + d.hours, 0) / weeklyHours.length).toFixed(1)}{' '}
                  saat
                </span>
              </p>
            </div>
          </Sec>
        </div>

        {/* ──── ROW 3: İzin Durumu | Belgeler (Evrak Arşivi) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Sec title="İzin Durumu" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
            <div className="text-xs text-gray-500 text-center py-6">
              İzin bilgisi bulunamadı
            </div>
          </Sec>

          <Sec title="Belgeler / Evrak Arşivi" icon={<FolderOpen className="h-3.5 w-3.5" />} className="lg:col-span-2">
            <div className="space-y-3 max-h-[200px] overflow-y-auto overscroll-contain pr-1">
              <div className="grid grid-cols-2 gap-2">
                {['Sözleşme', 'NDA', 'CV', 'Sertifika'].map((cat) => (
                  <div
                    key={cat}
                    className="rounded-lg border border-dashed border-gray-300 p-2.5 text-center text-xs text-gray-400"
                  >
                    {cat}
                    <div className="text-[10px] mt-0.5">Boş</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 text-center">Henüz belge yüklenmedi</p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 text-xs text-[#6161FF] hover:text-[#5050E0] py-2 rounded-lg border border-[#6161FF]/20 hover:bg-[#6161FF]/5 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Belge Yükle
              </button>
            </div>
          </Sec>
        </div>
      </div>
    </ScrollArea>
  );
}
