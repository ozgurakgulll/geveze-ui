import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  ChevronLeft,
  Search,
  Bell,
  HelpCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trash2,
  Archive,
  LogOut,
  Users,
  Check,
  LayoutGrid,
  BriefcaseBusiness,
  UserCircle,
  Plus,
  Home,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { ViewType } from '@/types';
import { DEFAULT_MEMBER_PERMISSIONS } from '@/types';
import logo from '@/assets/geveze-logo.png';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPerson: (personId: string) => void;
  onClearAllData?: () => void;
  onLogout?: () => void;
  companyName?: string;
  workspaceDescription?: string;
  embedded?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
  indented,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  indented?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-[#E5E7FF] text-[#6161FF]' : 'text-gray-700 hover:bg-gray-100',
        collapsed && 'justify-center px-2',
        indented && !collapsed && 'pl-7',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
      {label}
    </div>
  );
}

export function Sidebar({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  onSelectPerson,
  onClearAllData,
  onLogout,
  companyName = 'Geveze',
  workspaceDescription: _workspaceDescription = 'Ajans iş takibi',
  embedded = false,
  searchQuery = '',
  onSearchChange,
}: SidebarProps) {
  const navigate = useNavigate();
  const users = useUsers();
  const { user: authUser } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspace();

  const isManager = authUser?.role === 'admin' || authUser?.role === 'manager';
  const effectiveCollapsed = embedded ? false : isCollapsed;

  const currentUserPerms = isManager
    ? null
    : users.find(u => u.id === authUser?.id)?.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
  const canViewAnalytics = isManager || (currentUserPerms?.canViewAnalytics ?? false);
  const canViewArchive  = isManager || (currentUserPerms?.canViewArchive ?? true);
  const canViewTrash    = isManager || (currentUserPerms?.canViewTrash ?? true);

  const [isEkipExpanded, setIsEkipExpanded] = useState(false);

  const isContentView = ['dashboard', 'table', 'board', 'timeline', 'calendar'].includes(currentView);

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 bg-[#F5F6F8] border-r border-gray-200 transition-all duration-300 ease-in-out',
        embedded ? 'w-full' : isCollapsed ? 'w-[60px]' : 'w-[240px]',
        !embedded && 'hidden md:flex'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-[54px] px-3 border-b border-gray-200 flex-shrink-0">
        {!effectiveCollapsed ? (
          <>
            <img src={logo} alt="Geveze CRM" className="h-6 w-auto object-contain" />
            {!embedded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-gray-600"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <img
            src={logo}
            alt="Geveze CRM"
            className="h-6 w-auto object-contain mx-auto cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={onToggleCollapse}
            onKeyDown={(e) => { if (e.key === 'Enter') onToggleCollapse(); }}
          />
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 pb-4">
          {/* Search */}
          {!effectiveCollapsed && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Görevlerde ara..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF] focus:border-transparent"
              />
            </div>
          )}

          {/* ── ÇALIŞMA ALANI ── */}
          <SectionLabel label="Çalışma Alanı" collapsed={effectiveCollapsed} />

          {!effectiveCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 transition-colors text-left">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: currentWorkspace?.color ?? '#6161FF' }}
                  >
                    {currentWorkspace?.name?.charAt(0).toUpperCase() ?? 'G'}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {currentWorkspace?.name ?? companyName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {workspaces.map(ws => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => navigate(`/workspaces/${ws.id}/dashboard`)}
                    className={cn('cursor-pointer gap-2', ws.id === currentWorkspace?.id && 'bg-indigo-50')}
                  >
                    <div className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ backgroundColor: ws.color }} />
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.id === currentWorkspace?.id && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/workspaces')}
                  className="cursor-pointer text-gray-500 gap-2"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Tüm Alanlar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/workspaces')}
                  className="cursor-pointer text-indigo-600 gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni Alan Ekle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              className="w-full flex justify-center py-2 mb-1"
              onClick={() => navigate('/workspaces')}
              title={currentWorkspace?.name ?? companyName}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentWorkspace?.color ?? '#6161FF' }}
              >
                {currentWorkspace?.name?.charAt(0).toUpperCase() ?? 'G'}
              </div>
            </button>
          )}

          {/* Ana içerik alanına giriş butonu */}
          <NavItem
            icon={Home}
            label="Görev Panosu"
            active={isContentView}
            onClick={() => onViewChange('table')}
            collapsed={effectiveCollapsed}
            indented
          />

          {/* ── RAPORLAR ── */}
          <SectionLabel label="Raporlar" collapsed={effectiveCollapsed} />

          {canViewAnalytics && (
            <NavItem
              icon={BarChart3}
              label="Analitik"
              active={currentView === 'analytics'}
              onClick={() => onViewChange('analytics')}
              collapsed={effectiveCollapsed}
            />
          )}
          <NavItem
            icon={BriefcaseBusiness}
            label="Portföy"
            active={currentView === 'portfolio'}
            onClick={() => onViewChange('portfolio')}
            collapsed={effectiveCollapsed}
          />
          <NavItem
            icon={UserCircle}
            label="Kişi Görünümü"
            active={currentView === 'person'}
            onClick={() => onViewChange('person')}
            collapsed={effectiveCollapsed}
          />

          <SectionLabel label="Yönetim" collapsed={effectiveCollapsed} />

          {isManager && (
            <NavItem
              icon={Users}
              label="Kullanıcılar"
              active={currentView === 'users'}
              onClick={() => onViewChange('users')}
              collapsed={effectiveCollapsed}
            />
          )}
          {canViewArchive && (
            <NavItem
              icon={Archive}
              label="Arşiv"
              active={currentView === 'archive'}
              onClick={() => onViewChange('archive')}
              collapsed={effectiveCollapsed}
            />
          )}
          {canViewTrash && (
            <NavItem
              icon={Trash2}
              label="Son Silinenler"
              active={currentView === 'trash'}
              onClick={() => onViewChange('trash')}
              collapsed={effectiveCollapsed}
            />
          )}
          <NavItem
            icon={Settings}
            label="Alan Ayarları"
            active={currentView === 'settings'}
            onClick={() => onViewChange('settings')}
            collapsed={effectiveCollapsed}
          />

          {/* ── EKİP ── */}
          {!effectiveCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setIsEkipExpanded(p => !p)}
                className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                <span>Ekip</span>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{users.length}</Badge>
                  {isEkipExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>
              {isEkipExpanded && (
                <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => onSelectPerson(user.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-left"
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0" style={{ backgroundColor: user.color }}>
                        <AvatarFallback className="text-[9px] font-medium text-white">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{user.name}</div>
                        {user.title && (
                          <div className="text-[10px] text-gray-500 truncate">{user.title}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-2">
              {users.slice(0, 4).map((user) => (
                <Avatar
                  key={user.id}
                  className="w-7 h-7 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                  style={{ backgroundColor: user.color }}
                  onClick={() => onSelectPerson(user.id)}
                >
                  <AvatarFallback className="text-[9px] font-medium text-white">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Bar */}
      <div className={cn(
        'flex-shrink-0 p-2 border-t border-gray-200',
        effectiveCollapsed ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'
      )}>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 ml-auto rounded-full flex-shrink-0',
                effectiveCollapsed && 'ml-0'
              )}
              style={{ backgroundColor: users.find(u => u.id === authUser?.id)?.color ?? '#6161FF' }}
            >
              <span className="text-xs font-medium text-white">
                {users.find(u => u.id === authUser?.id)?.initials ?? authUser?.name?.charAt(0) ?? 'K'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {onLogout && (
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            )}
            {onClearAllData && (
              <DropdownMenuItem
                variant="destructive"
                onClick={onClearAllData}
                className="cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Verileri temizle
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
