import { useState, useMemo } from 'react';
import { Users, Plus, Search, Shield, User as UserIcon, ShieldCheck, Pencil, Trash2, KeyRound, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useUsers } from '@/contexts/UsersContext';
import type { User, UserPermissions, AppRole } from '@/types';
import { AddUserDialog } from './AddUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { PermissionsSheet } from './PermissionsSheet';
import { ResetPasswordDialog } from './ResetPasswordDialog';

interface UsersManagementViewProps {
  currentUser: { id: string; role: string } | null;
  onCreateUser: (data: {
    email: string; name: string; initials: string; color: string;
    title?: string; role: string; password: string;
  }) => Promise<void>;
  onUpdateUser: (id: string, data: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onUpdateUserPermissions: (id: string, permissions: UserPermissions) => Promise<void>;
  onResetPassword: (id: string, newPassword: string) => Promise<void>;
  onUpdateUserRole: (id: string, role: AppRole) => Promise<void>;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  member: 'Üye',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  member: 'bg-gray-100 text-gray-700 border-gray-200',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-3 w-3" />,
  manager: <Shield className="h-3 w-3" />,
  member: <UserIcon className="h-3 w-3" />,
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${ROLE_COLORS[role] ?? ROLE_COLORS['member']}`}>
      {ROLE_ICONS[role]}
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function UsersManagementView({
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onUpdateUserPermissions,
  onResetPassword,
  onUpdateUserRole,
}: UsersManagementViewProps) {
  const users = useUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await onDeleteUser(deleteUser.id);
      toast.success(`${deleteUser.name} silindi`);
      setDeleteUser(null);
    } catch {
      toast.error('Silme işlemi başarısız.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRoleChange = async (user: User, role: AppRole) => {
    try {
      await onUpdateUserRole(user.id, role);
      toast.success(`${user.name} rolü güncellendi`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rol değiştirilemedi.');
    }
  };

  const canChangeRole = (target: User) => {
    if (target.id === currentUser?.id) return false;
    if (isAdmin) return true;
    return false; // manager can't change roles
  };

  const canEditPermissions = (target: User) => {
    if (target.role === 'member') return isManager;
    if (target.role === 'manager') return isAdmin;
    return false;
  };

  const canDelete = (target: User) => {
    if (target.id === currentUser?.id) return false;
    return isManager;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#6161FF]/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-[#6161FF]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Kullanıcı Yönetimi</h1>
              <p className="text-sm text-gray-500">{users.length} kullanıcı</p>
            </div>
          </div>
          {isManager && (
            <Button onClick={() => setAddOpen(true)} className="bg-[#6161FF] hover:bg-[#5050E0] gap-2">
              <Plus className="h-4 w-4" />
              Yeni Kullanıcı
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="İsim veya e-posta ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Yönetici</SelectItem>
              <SelectItem value="member">Üye</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Users className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Kullanıcı bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(user => (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-[#6161FF]/20 transition-all"
              >
                {/* Card Header */}
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Sen</Badge>
                      )}
                    </div>
                    {user.title && <p className="text-xs text-gray-500 truncate">{user.title}</p>}
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>

                {/* Permissions preview for members */}
                {user.role === 'member' && user.permissions && (
                  <div className="mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">İzinler</p>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.canViewAnalytics && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Analitik</span>}
                      {user.permissions.canCreateTasks && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Görev Oluştur</span>}
                      {user.permissions.canDeleteTasks && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Görev Sil</span>}
                      {user.permissions.canManagePortfolio && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Portföy</span>}
                      {user.permissions.canEditOthersTasks && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Düzenle</span>}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Role change (admin only, not self) */}
                  {canChangeRole(user) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                          <Shield className="h-3 w-3" />
                          Rol Değiştir
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => handleRoleChange(user, 'member')} disabled={user.role === 'member'}>
                          <UserIcon className="h-4 w-4" /> Üye
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRoleChange(user, 'manager')} disabled={user.role === 'manager'}>
                          <Shield className="h-4 w-4" /> Yönetici
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRoleChange(user, 'admin')} disabled={user.role === 'admin'}>
                          <ShieldCheck className="h-4 w-4" /> Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Permissions (for members, admin+manager; for managers, admin only) */}
                  {canEditPermissions(user) && (
                    <Button
                      variant="outline" size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => { setPermUser(user); }}
                    >
                      <Lock className="h-3 w-3" />
                      İzinler
                    </Button>
                  )}

                  {/* Edit & more actions */}
                  {isManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto">
                          <span className="text-gray-500 text-base leading-none">⋯</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditUser(user)}>
                          <Pencil className="h-4 w-4" /> Profil Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setResetUser(user)}>
                          <KeyRound className="h-4 w-4" /> Şifre Sıfırla
                        </DropdownMenuItem>
                        {canDelete(user) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setDeleteUser(user)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" /> Kullanıcıyı Sil
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs & Sheets */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentUserRole={currentUser?.role ?? 'member'}
        onAdd={onCreateUser}
      />

      <EditUserDialog
        user={editUser}
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        onSave={onUpdateUser}
      />

      <PermissionsSheet
        user={permUser}
        open={Boolean(permUser)}
        onClose={() => setPermUser(null)}
        onSave={onUpdateUserPermissions}
      />

      <ResetPasswordDialog
        user={resetUser}
        open={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        onReset={onResetPassword}
      />

      <AlertDialog open={Boolean(deleteUser)} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteUser?.name}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Siliniyor…' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
