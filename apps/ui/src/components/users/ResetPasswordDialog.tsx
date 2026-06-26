import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';

interface ResetPasswordDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onReset: (userId: string, newPassword: string) => Promise<void>;
}

export function ResetPasswordDialog({ user, open, onClose, onReset }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setPassword('');
    setConfirm('');
    setShowPw(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await onReset(user.id, password);
      toast.success(`${user.name} şifresi sıfırlandı`);
      handleClose();
    } catch {
      toast.error('Şifre sıfırlanamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Şifre Sıfırla</DialogTitle>
          {user && (
            <p className="text-sm text-gray-500 mt-1">{user.name} — {user.email}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">Yeni Şifre</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Şifre Tekrar</Label>
            <Input
              id="confirm-pw"
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>İptal</Button>
            <Button
              type="submit"
              disabled={saving || !password || !confirm}
              className="bg-[#6161FF] hover:bg-[#5050E0]"
            >
              {saving ? 'Sıfırlanıyor…' : 'Sıfırla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
