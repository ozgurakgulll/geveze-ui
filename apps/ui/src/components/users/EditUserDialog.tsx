import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { User } from '@/types';

const COLOR_SWATCHES = [
  '#FF6B6B', '#FF8E53', '#F59E0B', '#10B981', '#4ECDC4',
  '#45B7D1', '#6366F1', '#8B5CF6', '#EC4899', '#A78BFA',
  '#14B8A6', '#96CEB4',
];

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, data: Partial<User>) => Promise<void>;
}

export function EditUserDialog({ user, open, onClose, onSave }: EditUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#6161FF');
  const [initials, setInitials] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && open) {
      setName(user.name);
      setEmail(user.email);
      setTitle(user.title ?? '');
      setColor(user.color);
      setInitials(user.initials);
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !email.trim()) {
      toast.error('Ad ve e-posta zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await onSave(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        title: title.trim() || undefined,
        color,
        initials: initials.trim().slice(0, 3) || user.initials,
      });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profil Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="e-name">Ad Soyad</Label>
              <Input id="e-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="e-email">E-posta</Label>
              <Input id="e-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-title">Ünvan</Label>
              <Input id="e-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Grafik Tasarımcı" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-initials">Kısaltma</Label>
              <Input id="e-initials" value={initials} onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? '#1e1e1e' : 'transparent' }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color }}>
                {initials || '?'}
              </span>
              <span className="text-sm text-gray-500">Önizleme</span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#6161FF] hover:bg-[#5050E0]"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
