import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useUsers } from '@/contexts/UsersContext';
import { DocumentUploadDialog } from '@/components/DocumentUploadDialog';
import { BrandGalleryDialog } from '@/components/BrandGalleryDialog';
import { CompanyAnalyticsView } from '@/components/CompanyAnalyticsView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2 as Trash2Icon, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  PortfolioCompany,
  PortfolioCompanyDraft,
  MonthlyContentQuota,
  PortfolioRole,
  PortfolioStatus,
  Task,
  TaskAttachment,
  SocialMediaAccount,
  BrandIdentity,
  CompanyContact,
  ContentCalendarItem,
} from '@/types';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckSquare,
  FileText,
  Globe,
  Image as ImageIcon,
  Lock,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users as UsersIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

/* ────────── constants ────────── */

const statusMap: Record<PortfolioStatus, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700' },
  'on-hold': { label: 'Beklemede', className: 'bg-amber-100 text-amber-700' },
  left: { label: 'Ayrıldı', className: 'bg-gray-200 text-gray-700' },
};

const fmtDate = (value?: string) =>
  value ? format(new Date(value), 'd MMM yyyy', { locale: tr }) : '-';

const getServiceLabel = (s: string): string => {
  const map: Record<string, string> = {
    SEO: 'SEO',
    'Performance Marketing': 'Performans Pazarlaması',
    'Influencer Marketing': 'Influencer Pazarlaması',
  };
  return map[s] ?? s;
};

const roleLabelMap: Record<PortfolioRole, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  editor: 'Editör',
  viewer: 'Görüntüleyici',
};

const contentStatusLabelMap: Record<'planned' | 'in-production' | 'published', string> = {
  planned: 'Planlandı',
  'in-production': 'Üretimde',
  published: 'Yayında',
};

const contentStatusClasses: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  'in-production': 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
};

const activityActionMap: Record<string, string> = {
  'Portfolio created': 'Portföy kaydı oluşturuldu',
  'Client exited': 'Müşteri ayrıldı',
  'Quota updated': 'Kota güncellendi',
  'Logo uploaded': 'Logo yüklendi',
  'Calendar updated': 'Takvim güncellendi',
  'Status changed': 'Durum değiştirildi',
  'Brand tone changed': 'Marka tonu değiştirildi',
  'Logo package updated': 'Logo paketi güncellendi',
  'Portfolio updated': 'Portföy kaydı güncellendi',
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const extractPaletteFromImageAttachment = async (attachment: TaskAttachment, limit = 4): Promise<string[]> => {
  if (!attachment.type.startsWith('image/')) return [];
  if (typeof window === 'undefined') return [];
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = Math.min(img.naturalWidth || 64, 64);
      const h = Math.min(img.naturalHeight || 64, 64);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([]); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 40) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 245 || brightness < 12) continue;
        const qr = Math.round(r / 32) * 32, qg = Math.round(g / 32) * 32, qb = Math.round(b / 32) * 32;
        const key = `${qr}-${qg}-${qb}`;
        const prev = buckets.get(key);
        if (prev) prev.count += 1;
        else buckets.set(key, { count: 1, r: qr, g: qg, b: qb });
      }
      resolve([...buckets.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((i) => rgbToHex(i.r, i.g, i.b)));
    };
    img.onerror = () => resolve([]);
    img.src = `data:${attachment.type};base64,${attachment.data}`;
  });
};

/* ────────── SectionCard ────────── */

function Sec({ title, icon, badge, action, children, className }: {
  title: string; icon?: ReactNode; badge?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
            {badge}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

/* ────────── props ────────── */

export interface PortfolioDetailViewProps {
  company: PortfolioCompany;
  currentUserRole: PortfolioRole;
  onBack: () => void;
  onUpdateCompany: (companyId: string, payload: PortfolioCompanyDraft) => void;
  onDeleteCompany: (companyId: string) => void;
  canManage: boolean;
  serviceTypes: string[];
  onAddServiceType?: (name: string) => void;
  onRemoveServiceType?: (name: string) => void;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  portfolioSearchQuery?: string;
}

type EditDraft = {
  name: string;
  status: PortfolioStatus;
  startDate: string;
  exitDate: string;
  servicesTaken: string[];
  monthlyQuotas: MonthlyContentQuota;
  notesText: string;
  socialMediaAccounts: SocialMediaAccount[];
  brandIdentity: BrandIdentity;
  contacts: CompanyContact[];
  assignedTeamMemberIds: string[];
  monthlyContentCalendar: ContentCalendarItem[];
};

type DeleteConfirm = {
  type: 'company' | 'service' | 'contact' | 'social' | 'calendar' | 'logo';
  label?: string;
  serviceName?: string;
  contactIndex?: number;
  socialIndex?: number;
  calendarId?: string;
  logoId?: string;
} | null;

/* ────────── component ────────── */

export function PortfolioDetailView({
  company,
  currentUserRole,
  onBack,
  onUpdateCompany,
  onDeleteCompany,
  canManage,
  serviceTypes,
  onAddServiceType,
  onRemoveServiceType,
  tasks,
  onTaskClick,
  portfolioSearchQuery = '',
}: PortfolioDetailViewProps) {
  const users = useUsers();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [addTeamSelect, setAddTeamSelect] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);
  const [isLogoUploadOpen, setIsLogoUploadOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const companyTasks = useMemo(() => {
    let list = tasks.filter((t) => t.portfolioCompanyId === company.id);
    const q = portfolioSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tasks, company.id, portfolioSearchQuery]);
  const visibleAccounts = useMemo(() => company.socialMediaAccounts.filter((a) => a.visibleTo.includes(currentUserRole)), [company, currentUserRole]);
  const assignedMembers = useMemo(() => users.filter((u) => company.assignedTeamMemberIds.includes(u.id)), [company]);
  const totalQuota = company.monthlyQuotas.video + company.monthlyQuotas.post + company.monthlyQuotas.story + (company.monthlyQuotas.render3d ?? 0);
  const attachmentCount = (company.brandIdentity.logoAttachments ?? []).length;

  useEffect(() => { setIsEditing(false); setEditDraft(null); }, [company.id]);

  /* ── edit helpers ── */
  const startEdit = useCallback(() => {
    setEditDraft({
      name: company.name,
      status: company.status,
      startDate: company.startDate,
      exitDate: company.exitDate ?? '',
      servicesTaken: [...company.servicesTaken],
      monthlyQuotas: { ...company.monthlyQuotas },
      notesText: company.notes.join('\n'),
      socialMediaAccounts: company.socialMediaAccounts.map((a) => ({ ...a })),
      brandIdentity: {
        ...company.brandIdentity,
        logos: [...company.brandIdentity.logos],
        logoAttachments: [...(company.brandIdentity.logoAttachments ?? [])],
        colorPalette: [...company.brandIdentity.colorPalette],
        fonts: [...company.brandIdentity.fonts],
      },
      contacts: company.contacts.map((c) => ({ ...c })),
      assignedTeamMemberIds: [...company.assignedTeamMemberIds],
      monthlyContentCalendar: company.monthlyContentCalendar.map((i) => ({ ...i })),
    });
    setNewServiceInput('');
    setIsEditing(true);
  }, [company]);

  const cancelEdit = () => { setIsEditing(false); setEditDraft(null); };

  const saveEdit = () => {
    if (!editDraft) return;
    if (!editDraft.name.trim()) { toast.error('Şirket adı zorunludur.'); return; }
    const notes = editDraft.notesText.split('\n').map((n) => n.trim()).filter(Boolean);
    const payload: PortfolioCompanyDraft = {
      name: editDraft.name.trim(),
      status: editDraft.status,
      startDate: editDraft.startDate,
      exitDate: editDraft.exitDate || undefined,
      servicesTaken: editDraft.servicesTaken,
      monthlyQuotas: editDraft.monthlyQuotas,
      notes,
      socialMediaAccounts: editDraft.socialMediaAccounts.filter((a) => a.platform.trim() || a.handle.trim() || a.url.trim()),
      brandIdentity: editDraft.brandIdentity,
      contacts: editDraft.contacts.filter((c) => c.name.trim() || c.email.trim()),
      assignedTeamMemberIds: editDraft.assignedTeamMemberIds,
      monthlyContentCalendar: editDraft.monthlyContentCalendar.filter((i) => i.title.trim()),
    };
    onUpdateCompany(company.id, payload);
    toast.success('Şirket bilgileri kaydedildi');
    setIsEditing(false);
    setEditDraft(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'company') {
      onDeleteCompany(company.id);
    } else if (deleteConfirm.type === 'service' && editDraft) {
      const sn = deleteConfirm.serviceName!;
      setEditDraft((d) => d && { ...d, servicesTaken: d.servicesTaken.filter((x) => x !== sn) });
      onRemoveServiceType?.(sn);
    } else if (deleteConfirm.type === 'contact' && editDraft && deleteConfirm.contactIndex !== undefined) {
      setEditDraft((d) => d && { ...d, contacts: d.contacts.filter((_, i) => i !== deleteConfirm.contactIndex) });
    } else if (deleteConfirm.type === 'social' && editDraft && deleteConfirm.socialIndex !== undefined) {
      setEditDraft((d) => d && { ...d, socialMediaAccounts: d.socialMediaAccounts.filter((_, i) => i !== deleteConfirm.socialIndex) });
    } else if (deleteConfirm.type === 'calendar' && editDraft && deleteConfirm.calendarId) {
      setEditDraft((d) => d && { ...d, monthlyContentCalendar: d.monthlyContentCalendar.filter((i) => i.id !== deleteConfirm.calendarId) });
    } else if (deleteConfirm.type === 'logo' && editDraft && deleteConfirm.logoId) {
      setEditDraft((d) => d && { ...d, brandIdentity: { ...d.brandIdentity, logoAttachments: (d.brandIdentity.logoAttachments ?? []).filter((a) => a.id !== deleteConfirm.logoId) } });
    }
    setDeleteConfirm(null);
  };

  /* ── analytics sub-view ── */
  if (showAnalytics) {
    return (
      <CompanyAnalyticsView
        company={company}
        tasks={companyTasks}
        onBack={() => setShowAnalytics(false)}
        onTaskClick={onTaskClick ?? (() => {})}
      />
    );
  }

  /* ────────── RENDER ────────── */
  return (
    <>
      <ScrollArea className="h-full">
        <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">

          {/* ──── HEADER ──── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent text-gray-500 mb-1" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Portföy
              </Button>

              {isEditing && editDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">Düzenleme Modu</Badge>
                  </div>
                  <Input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => d && { ...d, name: e.target.value })}
                    className="text-2xl font-semibold h-12"
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-gray-500">Durum</Label>
                      <Select value={editDraft.status} onValueChange={(v) => setEditDraft((d) => d && { ...d, status: v as PortfolioStatus })}>
                        <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktif</SelectItem>
                          <SelectItem value="on-hold">Beklemede</SelectItem>
                          <SelectItem value="left">Ayrıldı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-gray-500">Başlangıç</Label>
                      <Input type="date" value={editDraft.startDate} onChange={(e) => setEditDraft((d) => d && { ...d, startDate: e.target.value })} className="w-[150px] h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-gray-500">Ayrılış</Label>
                      <Input type="date" value={editDraft.exitDate} onChange={(e) => setEditDraft((d) => d && { ...d, exitDate: e.target.value })} className="w-[150px] h-9" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{company.name}</h2>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <Badge className={cn('text-[11px]', statusMap[company.status].className)}>
                      {statusMap[company.status].label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {fmtDate(company.startDate)} — {fmtDate(company.exitDate)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {canManage && (
              <div className="flex items-center gap-2 shrink-0 pt-8">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>Vazgeç</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm({ type: 'company' })}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Sil
                    </Button>
                    <Button size="sm" className="bg-[#6161FF] hover:bg-[#5050E0]" onClick={saveEdit}>Kaydet</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Analitik
                    </Button>
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />Düzenle
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ──── KPI STAT BAR ──── */}
          {!isEditing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Hizmet', value: company.servicesTaken.length, icon: <CheckSquare className="h-4 w-4 text-[#6161FF]" /> },
                { label: 'Aylık Kota', value: totalQuota, icon: <Calendar className="h-4 w-4 text-amber-500" /> },
                { label: 'Ekip Üyesi', value: assignedMembers.length, icon: <UsersIcon className="h-4 w-4 text-emerald-500" /> },
                { label: 'Görev', value: companyTasks.length, icon: <FileText className="h-4 w-4 text-indigo-500" /> },
              ].map((kpi) => (
                <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{kpi.icon}</div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 leading-none">{kpi.value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{kpi.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ──── ROW 1: Hizmetler | Kotalar | Sosyal Medya ──── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Hizmetler */}
            <Sec title="Hizmetler" icon={<CheckSquare className="h-3.5 w-3.5" />}>
              {isEditing && editDraft ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[...serviceTypes, ...editDraft.servicesTaken.filter((s) => !serviceTypes.includes(s))].map((service) => {
                      const checked = editDraft.servicesTaken.includes(service);
                      const canRemove = !!onRemoveServiceType;
                      const pill = (
                        <div
                          key={service}
                          onClick={() => setEditDraft((d) => { if (!d) return d; const next = checked ? d.servicesTaken.filter((x) => x !== service) : [...d.servicesTaken, service]; return { ...d, servicesTaken: next }; })}
                          className={cn('rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors select-none', checked ? 'border-[#6161FF] bg-[#E5E7FF]/60 text-[#4040c8] font-medium' : 'border-gray-200 text-gray-400 hover:bg-gray-50')}
                        >
                          {getServiceLabel(service)}
                        </div>
                      );
                      return canRemove ? (
                        <ContextMenu key={service}>
                          <ContextMenuTrigger asChild>{pill}</ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem className="text-red-600" onClick={() => setDeleteConfirm({ type: 'service', serviceName: service, label: service })}>
                              <Trash2Icon className="mr-2 h-4 w-4" />Sil
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ) : pill;
                    })}
                  </div>
                  {onAddServiceType && (
                    <div className="flex gap-2 pt-1">
                      <Input placeholder="Yeni hizmet" value={newServiceInput} onChange={(e) => setNewServiceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newServiceInput.trim(); if (t) { onAddServiceType(t); setEditDraft((d) => d && !d.servicesTaken.includes(t) ? { ...d, servicesTaken: [...d.servicesTaken, t] } : d); setNewServiceInput(''); } } }} className="flex-1 h-8 text-xs" />
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => { const t = newServiceInput.trim(); if (t) { onAddServiceType(t); setEditDraft((d) => d && !d.servicesTaken.includes(t) ? { ...d, servicesTaken: [...d.servicesTaken, t] } : d); setNewServiceInput(''); } }} disabled={!newServiceInput.trim()}>
                        <Plus className="h-3 w-3 mr-1" />Ekle
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {company.servicesTaken.map((s) => (
                    <Badge key={s} className="bg-[#E5E7FF]/60 text-[#4040c8] border border-[#6161FF]/20 font-medium text-[11px]">
                      {getServiceLabel(s)}
                    </Badge>
                  ))}
                  {company.servicesTaken.length === 0 && <span className="text-gray-400 text-xs">Hizmet atanmamış</span>}
                </div>
              )}
            </Sec>

            {/* Kotalar */}
            <Sec title="Aylık Kotalar" icon={<Calendar className="h-3.5 w-3.5" />}>
              {isEditing && editDraft ? (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'video', label: 'Video' },
                    { key: 'post', label: 'Gönderi' },
                    { key: 'story', label: 'Hikaye' },
                    { key: 'render3d', label: '3D' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-[11px] text-gray-400">{label}</Label>
                      <Input type="number" min={0} value={key === 'render3d' ? (editDraft.monthlyQuotas.render3d ?? 0) : editDraft.monthlyQuotas[key]} onChange={(e) => setEditDraft((d) => d && { ...d, monthlyQuotas: { ...d.monthlyQuotas, [key]: Number(e.target.value) || 0 } })} className="h-8 text-sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: 'Video', value: company.monthlyQuotas.video, color: 'bg-[#6161FF]' },
                    { label: 'Gönderi', value: company.monthlyQuotas.post, color: 'bg-emerald-500' },
                    { label: 'Hikaye', value: company.monthlyQuotas.story, color: 'bg-amber-500' },
                    { label: '3D', value: company.monthlyQuotas.render3d ?? 0, color: 'bg-purple-500' },
                  ].map((q) => (
                    <div key={q.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', q.color)} />
                        <span className="text-gray-600 text-xs">{q.label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{q.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Sec>

            {/* Sosyal Medya */}
            <Sec title="Sosyal Medya" icon={<Globe className="h-3.5 w-3.5" />} badge={<Badge variant="secondary" className="text-[9px]">Gizli</Badge>}>
              {isEditing && editDraft ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1"><Lock className="h-3 w-3" />{roleLabelMap[currentUserRole]}</p>
                  {editDraft.socialMediaAccounts.map((account, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-start gap-1">
                        <Input placeholder="Platform" value={account.platform} onChange={(e) => setEditDraft((d) => d && { ...d, socialMediaAccounts: d.socialMediaAccounts.map((a, i) => i === idx ? { ...a, platform: e.target.value } : a) })} className="h-7 text-xs" />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500" onClick={() => setDeleteConfirm({ type: 'social', socialIndex: idx })}><X className="h-3 w-3" /></Button>
                      </div>
                      <Input placeholder="@kullanici" value={account.handle} onChange={(e) => setEditDraft((d) => d && { ...d, socialMediaAccounts: d.socialMediaAccounts.map((a, i) => i === idx ? { ...a, handle: e.target.value } : a) })} className="h-7 text-xs" />
                      <Input placeholder="https://" value={account.url} onChange={(e) => setEditDraft((d) => d && { ...d, socialMediaAccounts: d.socialMediaAccounts.map((a, i) => i === idx ? { ...a, url: e.target.value } : a) })} className="h-7 text-xs" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditDraft((d) => d && { ...d, socialMediaAccounts: [...d.socialMediaAccounts, { platform: '', handle: '', url: '', visibleTo: ['admin', 'manager'] }] })}>
                    <Plus className="h-3 w-3 mr-1" />Hesap Ekle
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleAccounts.length === 0 ? (
                    <p className="text-gray-400 text-xs">Bu role özel hesap yok.</p>
                  ) : visibleAccounts.map((acc) => (
                    <div key={`${acc.platform}-${acc.handle}`} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800">{acc.platform} <span className="text-gray-400 font-normal">{acc.handle}</span></p>
                        <a className="text-[10px] text-[#6161FF] hover:underline truncate block" href={acc.url} target="_blank" rel="noreferrer">{acc.url}</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Sec>
          </div>

          {/* ──── ROW 2: İletişim + Ekip | Takvim | Notlar + Aktivite ──── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* İletişim + Ekip */}
            <Sec title="İletişim & Ekip" icon={<UsersIcon className="h-3.5 w-3.5" />}>
              {isEditing && editDraft ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-gray-500">İletişim Kişileri</p>
                  {editDraft.contacts.map((contact, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-start gap-1">
                        <Input placeholder="Ad" value={contact.name} onChange={(e) => setEditDraft((d) => d && { ...d, contacts: d.contacts.map((c, i) => i === idx ? { ...c, name: e.target.value } : c) })} className="h-7 text-xs" />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500" onClick={() => setDeleteConfirm({ type: 'contact', contactIndex: idx })}><X className="h-3 w-3" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input placeholder="Rol" value={contact.role} onChange={(e) => setEditDraft((d) => d && { ...d, contacts: d.contacts.map((c, i) => i === idx ? { ...c, role: e.target.value } : c) })} className="h-7 text-xs" />
                        <Input placeholder="Telefon" value={contact.phone} onChange={(e) => setEditDraft((d) => d && { ...d, contacts: d.contacts.map((c, i) => i === idx ? { ...c, phone: e.target.value } : c) })} className="h-7 text-xs" />
                      </div>
                      <Input placeholder="E-posta" type="email" value={contact.email} onChange={(e) => setEditDraft((d) => d && { ...d, contacts: d.contacts.map((c, i) => i === idx ? { ...c, email: e.target.value } : c) })} className="h-7 text-xs" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditDraft((d) => d && { ...d, contacts: [...d.contacts, { name: '', role: '', email: '', phone: '' }] })}>
                    <Plus className="h-3 w-3 mr-1" />Kişi Ekle
                  </Button>

                  <Separator />
                  <p className="text-[11px] font-semibold text-gray-500">İç Ekip</p>
                  {users.filter((u) => !editDraft.assignedTeamMemberIds.includes(u.id)).length > 0 && (
                    <Select value={addTeamSelect} onValueChange={(uid) => { if (uid) { setEditDraft((d) => d && { ...d, assignedTeamMemberIds: [...d.assignedTeamMemberIds, uid] }); setAddTeamSelect(''); } }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Üye ekle..." /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u) => !editDraft.assignedTeamMemberIds.includes(u.id)).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5" style={{ backgroundColor: u.color }}><AvatarFallback className="text-[8px] text-white">{u.initials}</AvatarFallback></Avatar>
                              <span className="text-xs">{u.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {editDraft.assignedTeamMemberIds.map((uid) => {
                    const m = users.find((u) => u.id === uid);
                    if (!m) return null;
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6" style={{ backgroundColor: m.color }}><AvatarFallback className="text-[8px] text-white">{m.initials}</AvatarFallback></Avatar>
                          <span className="text-xs font-medium">{m.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setEditDraft((d) => d && { ...d, assignedTeamMemberIds: d.assignedTeamMemberIds.filter((id) => id !== uid) })}><X className="h-3 w-3" /></Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {company.contacts.map((c) => (
                    <div key={c.email} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <UsersIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-gray-500">{c.role} · {c.phone}</p>
                        <p className="text-gray-400 truncate">{c.email}</p>
                      </div>
                    </div>
                  ))}
                  {company.contacts.length === 0 && <p className="text-gray-400 text-xs">Kişi eklenmemiş.</p>}
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {assignedMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 rounded-full border border-gray-200 pl-1 pr-2.5 py-0.5">
                        <Avatar className="w-5 h-5" style={{ backgroundColor: m.color }}><AvatarFallback className="text-[8px] text-white">{m.initials}</AvatarFallback></Avatar>
                        <span className="text-[11px] text-gray-700">{m.name}</span>
                      </div>
                    ))}
                    {assignedMembers.length === 0 && <span className="text-gray-400 text-xs">Ekip üyesi yok.</span>}
                  </div>
                </div>
              )}
            </Sec>

            {/* İçerik Takvimi */}
            <Sec title="İçerik Takvimi" icon={<Calendar className="h-3.5 w-3.5" />}>
              {isEditing && editDraft ? (
                <div className="space-y-2">
                  {editDraft.monthlyContentCalendar.map((item) => (
                    <div key={item.id} className="rounded-lg border border-gray-200 p-2.5 space-y-1.5">
                      <div className="flex justify-between items-start gap-1">
                        <Input placeholder="Başlık" value={item.title} onChange={(e) => setEditDraft((d) => d && { ...d, monthlyContentCalendar: d.monthlyContentCalendar.map((i) => i.id === item.id ? { ...i, title: e.target.value } : i) })} className="h-7 text-xs" />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500" onClick={() => setDeleteConfirm({ type: 'calendar', calendarId: item.id })}><X className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input type="date" value={item.date} onChange={(e) => setEditDraft((d) => d && { ...d, monthlyContentCalendar: d.monthlyContentCalendar.map((i) => i.id === item.id ? { ...i, date: e.target.value } : i) })} className="flex-1 h-7 text-xs" />
                        <Input placeholder="Kanal" value={item.channel} onChange={(e) => setEditDraft((d) => d && { ...d, monthlyContentCalendar: d.monthlyContentCalendar.map((i) => i.id === item.id ? { ...i, channel: e.target.value } : i) })} className="w-24 h-7 text-xs" />
                        <Select value={item.status} onValueChange={(v) => setEditDraft((d) => d && { ...d, monthlyContentCalendar: d.monthlyContentCalendar.map((i) => i.id === item.id ? { ...i, status: v as 'planned' | 'in-production' | 'published' } : i) })}>
                          <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planlandı</SelectItem>
                            <SelectItem value="in-production">Üretimde</SelectItem>
                            <SelectItem value="published">Yayında</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditDraft((d) => d && { ...d, monthlyContentCalendar: [...d.monthlyContentCalendar, { id: `cal-${Date.now()}`, date: new Date().toISOString().slice(0, 10), title: '', channel: 'Instagram', status: 'planned' }] })}>
                    <Plus className="h-3 w-3 mr-1" />Plan Ekle
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {company.monthlyContentCalendar.length === 0 ? (
                    <p className="text-gray-400 text-xs py-2">Planlı içerik yok.</p>
                  ) : company.monthlyContentCalendar.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(item.date)} · {item.channel}</p>
                      </div>
                      <Badge className={cn('text-[9px] shrink-0', contentStatusClasses[item.status])}>
                        {contentStatusLabelMap[item.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Sec>

            {/* Notlar + Aktivite */}
            <Sec title="Notlar & Aktivite" icon={<FileText className="h-3.5 w-3.5" />}>
              {isEditing && editDraft ? (
                <Textarea
                  value={editDraft.notesText}
                  onChange={(e) => setEditDraft((d) => d && { ...d, notesText: e.target.value })}
                  rows={5}
                  placeholder="Her satır ayrı not."
                  className="text-xs"
                />
              ) : (
                <div className="space-y-2">
                  {company.notes.map((note, i) => (
                    <div key={i} className="rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1.5 text-xs text-gray-600">{note}</div>
                  ))}
                  <Separator />
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {company.activityLog.map((log) => (
                      <div key={log.id} className="text-[11px]">
                        <span className="font-medium text-gray-700">{activityActionMap[log.action] ?? log.action}</span>
                        <span className="text-gray-400 ml-1.5">{fmtDate(log.date)} · {log.author}</span>
                        {log.note && <p className="text-gray-500 mt-0.5">{log.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Sec>
          </div>

          {/* ──── KURUMSAL KİMLİK (full-width) ──── */}
          <Sec
            title="Kurumsal Kimlik"
            icon={<Palette className="h-3.5 w-3.5" />}
            badge={attachmentCount > 0 ? <Badge variant="secondary" className="text-[9px]">{attachmentCount} dosya</Badge> : undefined}
            action={
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => setIsGalleryOpen(true)}>
                <ImageIcon className="h-3 w-3" />Galeriyi Aç
              </Button>
            }
          >
            {isEditing && editDraft ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Logo Dosyaları</Label>
                    <Input value={editDraft.brandIdentity.logos.join(', ')} onChange={(e) => setEditDraft((d) => d && { ...d, brandIdentity: { ...d.brandIdentity, logos: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} className="h-8 text-xs" placeholder="logo.svg, logo-dark.svg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Renk Paleti (hex)</Label>
                    <Input value={editDraft.brandIdentity.colorPalette.join(', ')} onChange={(e) => setEditDraft((d) => d && { ...d, brandIdentity: { ...d.brandIdentity, colorPalette: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} className="h-8 text-xs" placeholder="#6161FF, #10B981" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Yazı Tipleri</Label>
                    <Input value={editDraft.brandIdentity.fonts.join(', ')} onChange={(e) => setEditDraft((d) => d && { ...d, brandIdentity: { ...d.brandIdentity, fonts: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-400">Marka Tonu</Label>
                    <Input value={editDraft.brandIdentity.brandTone} onChange={(e) => setEditDraft((d) => d && { ...d, brandIdentity: { ...d.brandIdentity, brandTone: e.target.value } })} className="h-8 text-xs" />
                  </div>
                </div>

                {/* Yüklü dosyalar (küçük önizleme) */}
                <div className="flex flex-wrap gap-2">
                  {(editDraft.brandIdentity.logoAttachments ?? []).map((att) => (
                    <div key={att.id} className="relative group w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      {att.type.startsWith('image/') ? (
                        <img src={`data:${att.type};base64,${att.data}`} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-300" />
                      )}
                      <button type="button" className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={() => setDeleteConfirm({ type: 'logo', logoId: att.id })}>
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-[#6161FF]/40 flex items-center justify-center transition-colors" onClick={() => setIsLogoUploadOpen(true)}>
                    <Upload className="h-5 w-5 text-gray-300" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-6 flex-wrap">
                {/* Önizlemeler */}
                <div className="flex gap-2">
                  {(company.brandIdentity.logoAttachments ?? []).slice(0, 4).map((att) => (
                    <div key={att.id} className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#6161FF]/30 transition-shadow" onClick={() => setIsGalleryOpen(true)}>
                      {att.type.startsWith('image/') ? (
                        <img src={`data:${att.type};base64,${att.data}`} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  ))}
                  {attachmentCount > 4 && (
                    <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-500 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsGalleryOpen(true)}>
                      +{attachmentCount - 4}
                    </div>
                  )}
                  {attachmentCount === 0 && <span className="text-gray-400 text-xs">Dosya yok</span>}
                </div>
                {/* Renk + font bilgisi */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {company.brandIdentity.colorPalette.map((c) => (
                      <span key={c} title={c} className="w-6 h-6 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  {company.brandIdentity.fonts.length > 0 && (
                    <span className="text-xs text-gray-500">{company.brandIdentity.fonts.join(', ')}</span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{company.brandIdentity.brandTone}</Badge>
                </div>
              </div>
            )}
          </Sec>

          {/* ──── Görevler (mini tablo) ──── */}
          {!isEditing && companyTasks.length > 0 && (
            <Sec title="Şirkete Atanan Görevler" icon={<CheckSquare className="h-3.5 w-3.5" />} badge={<Badge variant="secondary" className="text-[9px]">{companyTasks.length}</Badge>}>
              <div className="space-y-1">
                {companyTasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => onTaskClick?.(t.id)}>
                    <span className="text-xs font-medium text-gray-800 truncate flex-1 mr-3">{t.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{t.status}</Badge>
                  </div>
                ))}
                {companyTasks.length > 6 && <p className="text-[10px] text-gray-400 text-center pt-1">+{companyTasks.length - 6} görev daha</p>}
              </div>
            </Sec>
          )}
        </div>
      </ScrollArea>

      {/* ──── Dialogs ──── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === 'company' && 'Şirketi sil'}
              {deleteConfirm?.type === 'service' && 'Hizmeti sil'}
              {deleteConfirm?.type === 'contact' && 'İletişim kişisini sil'}
              {deleteConfirm?.type === 'social' && 'Sosyal medya hesabını sil'}
              {deleteConfirm?.type === 'calendar' && 'Takvim öğesini sil'}
              {deleteConfirm?.type === 'logo' && 'Belgeyi kaldır'}
            </AlertDialogTitle>
            <AlertDialogDescription>Bu işlemi onaylıyor musunuz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentUploadDialog
        open={isLogoUploadOpen}
        onClose={() => setIsLogoUploadOpen(false)}
        onUpload={async (attachment: TaskAttachment) => {
          const palette = await extractPaletteFromImageAttachment(attachment, 4);
          setEditDraft((d) => {
            if (!d) return d;
            const nextAtt = [...(d.brandIdentity.logoAttachments ?? []), attachment];
            const nextPalette = palette.length > 0 ? [...new Set([...palette, ...d.brandIdentity.colorPalette])].slice(0, 6) : d.brandIdentity.colorPalette;
            return { ...d, brandIdentity: { ...d.brandIdentity, logoAttachments: nextAtt, colorPalette: nextPalette } };
          });
          setIsLogoUploadOpen(false);
        }}
        taskTitle="Kurumsal kimlik belgesi veya logo"
      />

      <BrandGalleryDialog
        open={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        brandIdentity={isEditing && editDraft ? editDraft.brandIdentity : company.brandIdentity}
        isEditing={isEditing}
        onDeleteAttachment={isEditing ? (id) => setDeleteConfirm({ type: 'logo', logoId: id }) : undefined}
        onUploadClick={isEditing ? () => { setIsGalleryOpen(false); setIsLogoUploadOpen(true); } : undefined}
      />
    </>
  );
}
