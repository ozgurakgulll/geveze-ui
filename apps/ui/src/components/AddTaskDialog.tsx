import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { LabelChip } from '@/components/ui/LabelChip';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { PRIORITY_COLORS as priorityColors, PRIORITY_LABELS as priorityLabels } from '@/lib/constants';
import { useUsers } from '@/contexts/UsersContext';
import type { TaskStatus, Priority } from '@/types';
import { cn } from '@/lib/utils';

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    assigneeId: string;
    portfolioCompanyId: string;
    startDate?: Date;
    dueDate: Date | undefined;
    tags: string[];
  }) => void;
  portfolioOptions: Array<{ id: string; name: string }>;
  defaultStatus?: TaskStatus;
  defaultStartDate?: Date;
  defaultDueDate?: Date;
  defaultAssigneeId?: string;
  availableTags?: string[];
  tagColorMap?: Record<string, string>;
  onAddTag?: (name: string, color?: string) => void;
  tagServiceMap?: Record<string, string>;
  onSetTagService?: (tag: string, serviceType: string | null) => void;
}

const FALLBACK_TAGS = [
  'Web Site', 'Sosyal Medya', 'Tasarım', 'Post', 'Story',
  'Reels', 'Katalog', 'Tanıtım Filmi', '3D', 'Motion Graphic',
];

export function AddTaskDialog({
  isOpen,
  onClose,
  onAdd,
  portfolioOptions,
  defaultStatus = 'brief',
  defaultStartDate,
  defaultDueDate,
  defaultAssigneeId,
  availableTags: availableTagsProp,
  tagColorMap = {},
  onAddTag,
  tagServiceMap: _tagServiceMap,
  onSetTagService: _onSetTagService,
}: AddTaskDialogProps) {
  const users = useUsers();
  const baseTags = availableTagsProp ?? FALLBACK_TAGS;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(() => defaultStatus);
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState(() => defaultAssigneeId || '');
  const [portfolioCompanyId, setPortfolioCompanyId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(() => defaultStartDate ?? defaultDueDate);
  const [dueDate, setDueDate] = useState<Date | undefined>(() => defaultDueDate);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const availableTags = [
    ...baseTags,
    ...selectedTags.filter((s) => !baseTags.includes(s)),
  ];

  useEffect(() => {
    if (isOpen) {
      setStatus(defaultStatus);
      setStartDate(defaultStartDate ?? defaultDueDate);
      setDueDate(defaultDueDate);
      setAssigneeId(defaultAssigneeId || '');
      setSelectedTags([]);
      setNewTag('');
    }
  }, [isOpen, defaultStatus, defaultStartDate, defaultDueDate, defaultAssigneeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Görev başlığı gerekli.');
      return;
    }
    if (!assigneeId.trim()) {
      toast.error('Sorumlu (görev yetkilisi) seçmeniz gerekir.');
      return;
    }

    onAdd({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId,
      portfolioCompanyId,
      startDate: startDate ?? undefined,
      dueDate: dueDate ?? undefined,
      tags: selectedTags,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setAssigneeId('');
    setPortfolioCompanyId('');
    setStartDate(undefined);
    setDueDate(undefined);
    setSelectedTags([]);
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addNewTag = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      onAddTag?.(trimmed);
    }
    setNewTag('');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni Görev Oluştur</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Görev Başlığı <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Görev başlığı yaz..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              placeholder="Açıklama ekle..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Planlandı</SelectItem>
                  <SelectItem value="in-progress">Çalışılıyor</SelectItem>
                  <SelectItem value="review">İncelemede</SelectItem>
                  <SelectItem value="revision">Revizyonda</SelectItem>
                  <SelectItem value="done">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors.low }}
                      />
                      {priorityLabels.low}
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors.medium }}
                      />
                      {priorityLabels.medium}
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors.high }}
                      />
                      {priorityLabels.high}
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: priorityColors.urgent }}
                      />
                      {priorityLabels.urgent}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>
              Sorumlu (Tasarımcı) <span className="text-red-500">*</span>
            </Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sorumlu seç..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar
                        className="w-6 h-6"
                        style={{ backgroundColor: user.color }}
                      >
                        <AvatarFallback className="text-[10px] text-white">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Portfolio */}
          <div className="space-y-2">
            <Label>Portföy</Label>
            <Select
              value={portfolioCompanyId || '__none__'}
              onValueChange={(value) => setPortfolioCompanyId(value === '__none__' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Portföy seç..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Portföy seçmeden devam et</SelectItem>
                {portfolioOptions.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Başlangıç Tarihi & Son Teslim */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: tr }) : 'Tarih seç'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Son Teslim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: tr }) : 'Tarih seç'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <LabelChip
                  key={tag}
                  name={tag}
                  color={tagColorMap[tag] ?? '#6161FF'}
                  selected={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                  className={selectedTags.includes(tag) ? 'ring-2' : 'opacity-70 hover:opacity-100'}
                />
              ))}
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                {selectedTags.map((tag) => (
                  <LabelChip
                    key={tag}
                    name={tag}
                    color={tagColorMap[tag] ?? '#6161FF'}
                    onRemove={() => toggleTag(tag)}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Yeni etiket adı..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewTag(e); } }}
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => addNewTag(e)}
                onPointerDownCapture={(e) => e.stopPropagation()}
                title="Etiket ekle"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              className="bg-[#6161FF] hover:bg-[#5050E0]"
              disabled={!title.trim() || !assigneeId.trim()}
            >
              Görev Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
