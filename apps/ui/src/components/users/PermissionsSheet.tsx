import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { User, UserPermissions } from '@/types';
import { DEFAULT_MEMBER_PERMISSIONS } from '@/types';

interface PermissionsSheetProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: UserPermissions) => Promise<void>;
}

const PERMISSION_LABELS: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'canViewAnalytics',   label: 'Analitik',            description: 'Analitik sayfasını görüntüleyebilir' },
  { key: 'canViewArchive',     label: 'Arşiv',               description: 'Arşivlenmiş görevleri görüntüleyebilir' },
  { key: 'canViewTrash',       label: 'Çöp Kutusu',          description: 'Son silinen görevleri görüntüleyebilir' },
  { key: 'canManagePortfolio', label: 'Portföy Yönetimi',    description: 'Portföy şirketlerini oluşturabilir ve düzenleyebilir' },
  { key: 'canCreateTasks',     label: 'Görev Oluşturma',     description: 'Yeni görev oluşturabilir' },
  { key: 'canDeleteTasks',     label: 'Görev Silme',         description: 'Görevleri çöp kutusuna gönderebilir' },
  { key: 'canEditOthersTasks', label: 'Başkasının Görevini Düzenleme', description: 'Kendisine atanmamış görevleri düzenleyebilir' },
];

export function PermissionsSheet({ user, open, onClose, onSave }: PermissionsSheetProps) {
  const [perms, setPerms] = useState<UserPermissions>(
    user?.permissions ?? DEFAULT_MEMBER_PERMISSIONS
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPerms(user?.permissions ?? DEFAULT_MEMBER_PERMISSIONS);
  }, [user]);

  const currentPerms = user?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;

  const handleToggle = (key: keyof UserPermissions) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await onSave(user.id, perms);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPerms(currentPerms);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-lg">İzin Yönetimi</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 mt-1">
              <span
                className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.initials}
              </span>
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <p className="text-xs text-gray-500 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Admin ve yöneticiler tüm izinlere sahiptir, bu ayarlar yalnızca üyeler için geçerlidir.
          </p>
          <div className="space-y-1">
            {PERMISSION_LABELS.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 mr-4">
                  <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</Label>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <Switch
                  id={key}
                  checked={perms[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#6161FF] hover:bg-[#5050E0]"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
