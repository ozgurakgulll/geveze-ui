import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { PortfolioCompany, PortfolioCompanyDraft, PortfolioStatus, ServiceType } from '@/types';

interface PortfolioCompanyDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialCompany?: PortfolioCompany | null;
  serviceTypes: string[];
  onAddServiceType?: (name: string) => void;
  onRemoveServiceType?: (name: string) => void;
  onClose: () => void;
  onSubmit: (payload: PortfolioCompanyDraft) => void;
}

const statusOptions: Array<{ value: PortfolioStatus; label: string }> = [
  { value: 'active', label: 'Aktif' },
  { value: 'on-hold', label: 'Beklemede' },
  { value: 'left', label: 'Ayrıldı' },
];

const getToday = () => new Date().toISOString().slice(0, 10);

const getDefaultDraft = (): PortfolioCompanyDraft => ({
  name: '',
  status: 'active',
  startDate: getToday(),
  exitDate: undefined,
  servicesTaken: [],
  monthlyQuotas: {
    video: 0,
    post: 0,
    story: 0,
    render3d: 0,
  },
  notes: [],
});

export function PortfolioCompanyDialog({
  open,
  mode,
  initialCompany,
  serviceTypes = [],
  onAddServiceType,
  onRemoveServiceType,
  onClose,
  onSubmit,
}: PortfolioCompanyDialogProps) {
  const initialDraft = useMemo(() => {
    if (mode === 'edit' && initialCompany) {
      return {
        name: initialCompany.name,
        status: initialCompany.status,
        startDate: initialCompany.startDate,
        exitDate: initialCompany.exitDate ?? '',
        servicesTaken: initialCompany.servicesTaken,
        monthlyQuotas: initialCompany.monthlyQuotas,
        notesText: initialCompany.notes.join('\n'),
      };
    }

    const defaults = getDefaultDraft();
    return {
      name: defaults.name,
      status: defaults.status,
      startDate: defaults.startDate,
      exitDate: defaults.exitDate ?? '',
      servicesTaken: defaults.servicesTaken,
      monthlyQuotas: defaults.monthlyQuotas,
      notesText: '',
    };
  }, [mode, initialCompany]);

  const [name, setName] = useState(initialDraft.name);
  const [status, setStatus] = useState<PortfolioStatus>(initialDraft.status);
  const [startDate, setStartDate] = useState(initialDraft.startDate);
  const [exitDate, setExitDate] = useState(initialDraft.exitDate);
  const [servicesTaken, setServicesTaken] = useState<ServiceType[]>(initialDraft.servicesTaken);
  const [videoQuota, setVideoQuota] = useState<number>(initialDraft.monthlyQuotas.video);
  const [postQuota, setPostQuota] = useState<number>(initialDraft.monthlyQuotas.post);
  const [storyQuota, setStoryQuota] = useState<number>(initialDraft.monthlyQuotas.story);
  const [render3dQuota, setRender3dQuota] = useState<number>(
    initialDraft.monthlyQuotas.render3d ?? 0
  );
  const [notesText, setNotesText] = useState(initialDraft.notesText);
  const [newServiceInput, setNewServiceInput] = useState('');

  const title = useMemo(
    () => (mode === 'create' ? 'Yeni Şirket Ekle' : 'Şirket Bilgilerini Düzenle'),
    [mode]
  );

  const toggleService = (service: string) => {
    setServicesTaken((prev) =>
      prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service]
    );
  };

  const handleAddNewService = () => {
    const trimmed = newServiceInput.trim();
    if (!trimmed) return;
    onAddServiceType?.(trimmed);
    setNewServiceInput('');
    if (!servicesTaken.includes(trimmed)) {
      setServicesTaken((prev) => [...prev, trimmed]);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('Şirket adı zorunludur.');
      return;
    }

    if (!startDate) {
      toast.error('Başlangıç tarihi zorunludur.');
      return;
    }

    if (videoQuota < 0 || postQuota < 0 || storyQuota < 0 || render3dQuota < 0) {
      toast.error('Kotalar negatif olamaz.');
      return;
    }

    if (exitDate && exitDate < startDate) {
      toast.error('Ayrılış tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    const notes = notesText
      .split('\n')
      .map((note) => note.trim())
      .filter((note) => note.length > 0);

    onSubmit({
      name: name.trim(),
      status,
      startDate,
      exitDate: exitDate || undefined,
      servicesTaken,
      monthlyQuotas: {
        video: videoQuota,
        post: postQuota,
        story: storyQuota,
        render3d: render3dQuota,
      },
      notes,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="portfolio-company-name">Şirket Adı</Label>
              <Input
                id="portfolio-company-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Örn: ACME Teknoloji"
              />
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as PortfolioStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-company-start-date">Başlangıç Tarihi</Label>
              <Input
                id="portfolio-company-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-company-exit-date">Ayrılış Tarihi</Label>
              <Input
                id="portfolio-company-exit-date"
                type="date"
                value={exitDate}
                onChange={(event) => setExitDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alınan Hizmetler</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...serviceTypes, ...servicesTaken.filter((s) => !serviceTypes.includes(s))].map(
                (service) => {
                  const checked = servicesTaken.includes(service);
                  const inputId = `portfolio-service-${service
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')}`;
                  const canRemove = !!onRemoveServiceType;
                  const handleRemove = () => {
                    setServicesTaken((prev) => prev.filter((s) => s !== service));
                    onRemoveServiceType?.(service);
                  };
                  const content = (
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                        checked
                          ? 'border-[#6161FF] bg-[#E5E7FF]/50 text-[#3b3bc8]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <label htmlFor={inputId} className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            const isChecked = nextChecked === true;
                            if (isChecked === checked) return;
                            toggleService(service);
                          }}
                        />
                        <span className="truncate">{service}</span>
                      </label>
                    </div>
                  );
                  return canRemove ? (
                    <ContextMenu key={service}>
                      <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={handleRemove}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    <Fragment key={service}>{content}</Fragment>
                  );
                }
              )}
            </div>
            {onAddServiceType && (
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Yeni hizmet adı"
                  value={newServiceInput}
                  onChange={(e) => setNewServiceInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewService())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={handleAddNewService}
                  disabled={!newServiceInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                  Yeni hizmet ekle
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Aylık Kotalar</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="portfolio-company-video" className="text-xs text-gray-500">Video</Label>
                <Input
                  id="portfolio-company-video"
                  type="number"
                  min={0}
                  value={videoQuota}
                  onChange={(event) => setVideoQuota(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portfolio-company-post" className="text-xs text-gray-500">Gönderi</Label>
                <Input
                  id="portfolio-company-post"
                  type="number"
                  min={0}
                  value={postQuota}
                  onChange={(event) => setPostQuota(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portfolio-company-story" className="text-xs text-gray-500">Hikaye</Label>
                <Input
                  id="portfolio-company-story"
                  type="number"
                  min={0}
                  value={storyQuota}
                  onChange={(event) => setStoryQuota(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portfolio-company-render3d" className="text-xs text-gray-500">3D</Label>
                <Input
                  id="portfolio-company-render3d"
                  type="number"
                  min={0}
                  value={render3dQuota}
                  onChange={(event) => setRender3dQuota(Number(event.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-company-notes">Notlar</Label>
            <Textarea
              id="portfolio-company-notes"
              rows={5}
              placeholder="Her satır ayrı not olarak kaydedilir."
              value={notesText}
              onChange={(event) => setNotesText(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="bg-[#6161FF] hover:bg-[#5050E0]">
              {mode === 'create' ? 'Şirket Ekle' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
