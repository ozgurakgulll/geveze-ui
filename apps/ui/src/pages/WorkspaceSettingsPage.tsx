import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, UserPlus, Crown, ShieldCheck, User, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import { useUsers } from '@/contexts/UsersContext';
import type { WorkspaceRole } from '@/types';

const PRESET_COLORS = [
  '#6161FF', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  workspace_admin: 'Admin',
  workspace_manager: 'Yönetici',
  workspace_member: 'Üye',
  workspace_viewer: 'Görüntüleyici',
};

const ROLE_ICONS: Record<WorkspaceRole, typeof Crown> = {
  workspace_admin: Crown,
  workspace_manager: ShieldCheck,
  workspace_member: User,
  workspace_viewer: Eye,
};

export function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const { currentWorkspace, updateWorkspace, deleteWorkspace, addMember, updateMemberRole, removeMember } = useWorkspace();
  const { isAdmin } = useWorkspacePermissions();
  const allUsers = useUsers();

  // General settings form — currentWorkspace değişince senkronize et
  const [name, setName] = useState(currentWorkspace?.name ?? '');
  const [description, setDescription] = useState(currentWorkspace?.description ?? '');
  const [color, setColor] = useState(currentWorkspace?.color ?? '#6161FF');

  useEffect(() => {
    setName(currentWorkspace?.name ?? '');
    setDescription(currentWorkspace?.description ?? '');
    setColor(currentWorkspace?.color ?? '#6161FF');
  }, [currentWorkspace?.id]);
  const [isSaving, setIsSaving] = useState(false);

  // Add member dialog
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<WorkspaceRole>('workspace_member');
  const [isAdding, setIsAdding] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Çalışma alanı bulunamadı.
      </div>
    );
  }

  const memberUserIds = new Set(currentWorkspace.members.map(m => m.userId));
  const nonMembers = allUsers.filter(u => !memberUserIds.has(u.id));

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success('Çalışma alanı güncellendi');
    } catch {
      toast.error('Güncellenemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    setIsAdding(true);
    try {
      await addMember(addUserId, addRole);
      toast.success('Üye eklendi');
      setShowAddMember(false);
      setAddUserId('');
      setAddRole('workspace_member');
    } catch {
      toast.error('Üye eklenemedi');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    try {
      await updateMemberRole(userId, role);
      toast.success('Rol güncellendi');
    } catch {
      toast.error('Rol değiştirilemedi');
    }
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (!window.confirm(`"${userName}" üyeyi çalışma alanından çıkarmak istediğinize emin misiniz?`)) return;
    try {
      await removeMember(userId);
      toast.success('Üye çıkarıldı');
    } catch {
      toast.error('Üye çıkarılamadı');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkspace(currentWorkspace.id);
      toast.success('Çalışma alanı silindi');
      navigate('/workspaces');
    } catch {
      toast.error('Silinemedi');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-xl font-bold text-gray-900">Çalışma Alanı Ayarları</h1>

        {/* General */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Genel</h2>

          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Ad</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">Açıklama</Label>
            <Input
              id="ws-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="İsteğe bağlı"
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => void handleSave()} disabled={!name.trim() || isSaving}>
                {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </Button>
            </div>
          )}
        </section>

        {/* Members */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Üyeler ({currentWorkspace.members.length})
            </h2>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Üye Ekle
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {currentWorkspace.members.map(member => {
              const user = allUsers.find(u => u.id === member.userId);
              const RoleIcon = ROLE_ICONS[member.role];
              return (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="w-8 h-8" style={{ backgroundColor: user?.color ?? '#6161FF' }}>
                    <AvatarFallback className="text-xs text-white font-medium">
                      {user?.initials ?? '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name ?? member.userId}
                    </p>
                    {user?.title && (
                      <p className="text-xs text-gray-500 truncate">{user.title}</p>
                    )}
                  </div>

                  {isAdmin ? (
                    <Select
                      value={member.role}
                      onValueChange={v => void handleRoleChange(member.userId, v as WorkspaceRole)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map(r => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() => void handleRemove(member.userId, user?.name ?? member.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Danger Zone */}
        {isAdmin && (
          <section className="bg-white rounded-xl border border-red-200 p-6 space-y-3">
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Tehlikeli Bölge</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Bu çalışma alanını sil</p>
                <p className="text-xs text-gray-500 mt-0.5">Bu işlem geri alınamaz.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Sil
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Üye Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kullanıcı</Label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kullanıcı seç…" />
                </SelectTrigger>
                <SelectContent>
                  {nonMembers.length === 0 ? (
                    <SelectItem value="_none" disabled>Eklenecek kullanıcı yok</SelectItem>
                  ) : nonMembers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={addRole} onValueChange={v => setAddRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)} disabled={isAdding}>
              İptal
            </Button>
            <Button onClick={() => void handleAddMember()} disabled={!addUserId || addUserId === '_none' || isAdding}>
              {isAdding ? 'Ekleniyor…' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Çalışma Alanını Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            <strong>{currentWorkspace.name}</strong> çalışma alanı kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              İptal
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? 'Siliniyor…' : 'Evet, Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
