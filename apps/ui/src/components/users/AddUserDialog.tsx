import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { AppRole } from '@/types';

const COLOR_SWATCHES = [
  '#FF6B6B', '#FF8E53', '#F59E0B', '#10B981', '#4ECDC4',
  '#45B7D1', '#6366F1', '#8B5CF6', '#EC4899', '#A78BFA',
  '#14B8A6', '#96CEB4',
];

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  currentUserRole: string;
  onAdd: (data: {
    email: string; name: string; initials: string; color: string;
    title?: string; role: string; password: string;
  }) => Promise<void>;
}

function autoInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function AddUserDialog({ open, onClose, currentUserRole, onAdd }: AddUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<AppRole>('member');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [initials, setInitials] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setPassword(''); setTitle('');
      setRole('member'); setColor(COLOR_SWATCHES[0]); setInitials('');
      setShowPw(false);
    }
  }, [open]);

  useEffect(() => {
    setInitials(autoInitials(name).slice(0, 3));
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Ad, e-posta ve şifre zorunludur.');
      return;
    }
    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), email: email.trim().toLowerCase(), password, title: title.trim() || undefined, role, color, initials: initials.trim() || autoInitials(name).slice(0, 3) || '?' });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Kullanıcı</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="u-name">Ad Soyad <span className="text-red-500">*</span></Label>
              <Input id="u-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nihat Birgül" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="u-email">E-posta <span className="text-red-500">*</span></Label>
              <Input id="u-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nihat@sirket.com" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="u-pw">Şifre <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="u-pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-title">Ünvan</Label>
              <Input id="u-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Grafik Tasarımcı" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-initials">Kısaltma</Label>
              <Input id="u-initials" value={initials} onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 3))} placeholder="NB" maxLength={3} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Üye</SelectItem>
                <SelectItem value="manager">Yönetici</SelectItem>
                {currentUserRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
              </SelectContent>
            </Select>
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
              disabled={saving || !name.trim() || !email.trim() || !password}
              className="bg-[#6161FF] hover:bg-[#5050E0]"
            >
              {saving ? 'Oluşturuluyor…' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
