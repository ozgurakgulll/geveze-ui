import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  BriefcaseBusiness,
  LayoutDashboard,
  KanbanSquare,
  CalendarDays,
  Clock,
  Table,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  MoreHorizontal,
  Star,
  FolderOpen,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trash2,
  Archive,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { currentProject } from '@/data/mockData';
import { useUsers } from '@/contexts/UsersContext';
import type { ViewType } from '@/types';
import logo from '@/assets/geveze-logo.png';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPerson: (personId: string) => void;
  onClearAllData?: () => void;
  /** When true, renders full-width for use inside Sheet (mobile drawer) */
  embedded?: boolean;
}

export function Sidebar({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  onSelectPerson,
  onClearAllData,
  embedded = false,
}: SidebarProps) {
  const users = useUsers();
  const effectiveCollapsed = embedded ? false : isCollapsed;
  const [isEkipExpanded, setIsEkipExpanded] = useState(true);

  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Gösterge Paneli', icon: LayoutDashboard },
    { id: 'board' as ViewType, label: 'Tahta', icon: KanbanSquare },
    { id: 'timeline' as ViewType, label: 'Zaman Çizelgesi', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Takvim', icon: CalendarDays },
  ];

  const projectItems: { view: ViewType; label: string; icon: typeof FolderOpen }[] = [
    { view: 'dashboard', label: 'Genel Bakış', icon: FolderOpen },
    { view: 'analytics', label: 'Analitik', icon: BarChart3 },
    { view: 'portfolio', label: 'Portföy', icon: BriefcaseBusiness },
  ];

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 bg-[#F5F6F8] border-r border-gray-200 transition-all duration-300 ease-in-out',
        embedded ? 'w-full' : isCollapsed ? 'w-[70px]' : 'w-[260px]',
        !embedded && 'hidden md:flex'
      )}
    >
      {/* Logo Area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!effectiveCollapsed && (
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Geveze CRM"
              className="h-7 w-auto object-contain"
            />
          </div>
        )}
        {effectiveCollapsed && (
          <img
            src={logo}
            alt="Geveze CRM"
            className="h-7 w-auto object-contain mx-auto"
          />
        )}
        {!effectiveCollapsed && !embedded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {effectiveCollapsed && !embedded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700 absolute -right-3 top-14 bg-white border border-gray-200 rounded-full shadow-sm"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search */}
        {!effectiveCollapsed && (
          <div className="flex-shrink-0 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ara..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF] focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Main Menu */}
        <div className="flex-shrink-0 px-2 py-2">
          {!effectiveCollapsed && (
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ana Menü
            </div>
          )}
          <button
            onClick={() => handleViewChange('table')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                currentView === 'table'
                  ? 'bg-[#E5E7FF] text-[#6161FF]'
                  : 'text-gray-700 hover:bg-gray-100',
                effectiveCollapsed && 'justify-center px-2'
            )}
          >
            <Table className="h-5 w-5 flex-shrink-0" />
            {!effectiveCollapsed && <span>Ana Tablo</span>}
          </button>

          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                currentView === item.id
                  ? 'bg-[#E5E7FF] text-[#6161FF]'
                  : 'text-gray-700 hover:bg-gray-100',
                effectiveCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!effectiveCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleViewChange('archive')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              currentView === 'archive'
                ? 'bg-[#E5E7FF] text-[#6161FF]'
                : 'text-gray-700 hover:bg-gray-100',
              effectiveCollapsed && 'justify-center px-2'
            )}
          >
            <Archive className="h-5 w-5 flex-shrink-0" />
            {!effectiveCollapsed && <span>Arşiv</span>}
          </button>
        </div>

        <Separator className="flex-shrink-0 my-2 mx-4" />

        {/* Project Section + Team Members */}
        <div className="flex-1 flex flex-col min-h-0 px-2 py-2 overflow-hidden">
          {!effectiveCollapsed && (
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proje
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Project Header */}
          {!effectiveCollapsed && (
            <div className="flex-shrink-0 px-3 py-3 mb-2 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: currentProject.color }}
                >
                  <Star className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{currentProject.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{currentProject.description}</p>
                </div>
              </div>
            </div>
          )}

          {projectItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleViewChange(item.view)}
              className={cn(
                'flex-shrink-0 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                currentView === item.view ? 'bg-[#E5E7FF] text-[#6161FF]' : 'text-gray-700 hover:bg-gray-100',
                effectiveCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!effectiveCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          {/* Ekip - Tıklanabilir, varsayılan açık, scroll edilebilir liste */}
          {!effectiveCollapsed && (
            <>
              <button
                type="button"
                onClick={() => setIsEkipExpanded((prev) => !prev)}
                className="flex-shrink-0 flex w-full items-center justify-between px-3 py-2 mt-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ekip
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {users.length}
                  </Badge>
                  {isEkipExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </button>
              {isEkipExpanded && (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-3 space-y-2 py-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => onSelectPerson(user.id)}
                        className="w-full flex items-center gap-2 text-left rounded-md px-2 py-1 hover:bg-gray-100"
                      >
                        <Avatar
                          className="w-7 h-7 border-2 border-white"
                          style={{ backgroundColor: user.color }}
                        >
                          <AvatarFallback className="text-[10px] font-medium text-white">
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{user.name}</div>
                          {user.title && (
                            <div className="text-xs text-gray-500 truncate">{user.title}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
          {effectiveCollapsed && !embedded && (
            <div className="flex items-center justify-center px-2">
              <div className="flex -space-x-2">
                {users.slice(0, 3).map((user) => (
                  <Avatar
                    key={user.id}
                    className="w-8 h-8 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: user.color }}
                  >
                    <AvatarFallback className="text-xs font-medium text-white">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200">
        <div className={cn('flex items-center gap-2', effectiveCollapsed && 'flex-col')}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-500 hover:text-gray-700"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-500 hover:text-gray-700"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-gray-700"
                aria-label="Ayarlar"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {onClearAllData && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onClearAllData}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verileri temizle ve sıfırla
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Avatar
            className="w-9 h-9 border-2 border-white cursor-pointer"
            style={{ backgroundColor: users[0].color }}
          >
            <AvatarFallback className="text-xs font-medium text-white">
              {users[0].initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
