import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const PRESET_COLORS = [
  '#6161FF', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CreateWorkspaceDialog({ open, onClose, onCreated }: Props) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6161FF');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const ws = await createWorkspace({ name: name.trim(), description: description.trim() || undefined, color });
      toast.success('Çalışma alanı oluşturuldu');
      onCreated(ws.id);
      onClose();
      setName('');
      setDescription('');
      setColor('#6161FF');
    } catch {
      toast.error('Çalışma alanı oluşturulamadı');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Çalışma Alanı</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Ad *</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Çalışma alanı adı"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">Açıklama</Label>
            <Input
              id="ws-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="İsteğe bağlı açıklama"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Oluşturuluyor…' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
