import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Filter,
  SortAsc,
  Search,
  MoreHorizontal,
  Share2,
  Download,
  Eye,
  Star,
  Users,
  Settings,
  Menu,
  AlertCircle,
} from 'lucide-react';
import { currentProject, statusLabels } from '@/data/mockData';
import { useUsers } from '@/contexts/UsersContext';
import type { TaskStatus } from '@/types';
import type { ViewType } from '@/types';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onAddTask: () => void;
  onOpenMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  assigneeFilter?: string;
  onAssigneeFilterChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  sortBy?: 'dueDate' | 'priority' | 'title';
  onSortByChange?: (value: 'dueDate' | 'priority' | 'title') => void;
  sortDir?: 'asc' | 'desc';
  onSortDirChange?: (value: 'asc' | 'desc') => void;
  overdueOnly?: boolean;
  onOverdueOnlyChange?: (value: boolean) => void;
}

export function Header({
  currentView,
  onViewChange,
  onAddTask,
  onOpenMenu,
  searchQuery = '',
  onSearchChange,
  assigneeFilter = '',
  onAssigneeFilterChange,
  statusFilter = '',
  onStatusFilterChange,
  sortBy = 'dueDate',
  onSortByChange,
  sortDir = 'asc',
  onSortDirChange,
  overdueOnly = false,
  onOverdueOnlyChange,
}: HeaderProps) {
  const users = useUsers();
  const viewLabels: Record<ViewType, string> = {
    dashboard: 'Gösterge Paneli',
    table: 'Ana Tablo',
    portfolio: 'Portföy',
    board: 'Tahta',
    timeline: 'Zaman Çizelgesi',
    calendar: 'Takvim',
    person: 'Kişi',
    analytics: 'Analitik',
    archive: 'Arşiv',
  };

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger - mobile only */}
          {onOpenMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 min-h-[44px] min-w-[44px]"
              onClick={onOpenMenu}
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: currentProject.color }}
            >
              <Star className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{currentProject.name}</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-yellow-500 hidden sm:flex">
            <Star className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="text-xs font-medium hidden sm:inline-flex">
            Aktif
          </Badge>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Share Button - hidden on mobile */}
          <Button variant="outline" size="sm" className="hidden md:flex gap-2">
            <Share2 className="h-4 w-4" />
            <span>Paylaş</span>
          </Button>

          {/* Team Avatars - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex -space-x-2">
              {users.slice(0, 3).map((user) => (
                <Avatar
                  key={user.id}
                  className="w-6 h-6 border-2 border-white"
                  style={{ backgroundColor: user.color }}
                >
                  <AvatarFallback className="text-[10px] font-medium text-white">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-gray-500">+{users.length - 3}</span>
          </div>

          {/* Diğer dropdown - mobilde Paylaş vb. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 min-h-[44px] min-w-[44px]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="md:hidden">
                <Share2 className="h-4 w-4 mr-2" />
                Paylaş
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Proje Ayarları
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                Görünüm Ayarları
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Veriyi Dışa Aktar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions - desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Proje Ayarları
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                Görünüm Ayarları
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Veriyi Dışa Aktar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom Bar - View Controls */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2 border-t border-gray-100 flex-wrap gap-2">
        {/* View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 flex-shrink-0">
          {(Object.keys(viewLabels) as ViewType[])
            .filter((view) => view !== 'person' && view !== 'analytics' && view !== 'portfolio')
            .map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === view
                  ? 'bg-[#E5E7FF] text-[#6161FF]'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {viewLabels[view]}
            </button>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search - smaller on mobile */}
          <div className="relative flex-1 min-w-[120px] md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={currentView === 'archive' ? 'Arşivde ara...' : 'Görevlerde ara...'}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-full md:w-64 pl-9 pr-3 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF] focus:border-transparent"
            />
          </div>

          {/* Filter — ana listeler için; Arşiv’de gizli */}
          {currentView !== 'archive' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-2',
                  (assigneeFilter || statusFilter || overdueOnly) && 'border-[#6161FF] text-[#6161FF]'
                )}
              >
                <Filter className="h-4 w-4" />
                <span>Filtre</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-1.5rem,22rem)] p-3" align="end">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  Filtrele
                </div>

                {/* Gecikmiş işler */}
                <div>
                  <div className="text-[10px] font-medium text-gray-500 mb-1.5">Gecikmiş</div>
                  <button
                    type="button"
                    onClick={() => onOverdueOnlyChange?.(!overdueOnly)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      overdueOnly
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Gecikmiş işler
                  </button>
                </div>

                {/* Kişi */}
                <div>
                  <div className="text-[10px] font-medium text-gray-500 mb-1.5">Kişi</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => onAssigneeFilterChange?.('')}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        !assigneeFilter
                          ? 'border-[#6161FF] bg-[#E5E7FF]/50 text-[#3b3bc8]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      Tümü
                    </button>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => onAssigneeFilterChange?.(u.id)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors max-w-[9rem] truncate',
                          assigneeFilter === u.id
                            ? 'border-[#6161FF] bg-[#E5E7FF]/50 text-[#3b3bc8]'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                        title={u.name}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Durum */}
                <div>
                  <div className="text-[10px] font-medium text-gray-500 mb-1.5">Durum</div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => onStatusFilterChange?.('')}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        !statusFilter
                          ? 'border-[#6161FF] bg-[#E5E7FF]/50 text-[#3b3bc8]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      Tümü
                    </button>
                    {(Object.entries(statusLabels) as [TaskStatus, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => onStatusFilterChange?.(val)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                          statusFilter === val
                            ? 'border-[#6161FF] bg-[#E5E7FF]/50 text-[#3b3bc8]'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {(assigneeFilter || statusFilter || overdueOnly) && (
                  <button
                    type="button"
                    className="w-full text-[11px] text-gray-500 hover:text-[#6161FF] py-1 border-t border-gray-100 pt-2"
                    onClick={() => {
                      onAssigneeFilterChange?.('');
                      onStatusFilterChange?.('');
                      onOverdueOnlyChange?.(false);
                    }}
                  >
                    Filtreleri temizle
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          )}

          {currentView !== 'archive' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SortAsc className="h-4 w-4" />
                <span>Sırala</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Sırala</span>
              </div>
              <div className="p-2 space-y-3">
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1.5">Alan</div>
                  <select
                    value={sortBy}
                    onChange={(e) => onSortByChange?.(e.target.value as 'dueDate' | 'priority' | 'title')}
                    className="w-full h-9 px-2 rounded border border-gray-200 text-sm"
                  >
                    <option value="dueDate">Son teslim</option>
                    <option value="priority">Öncelik</option>
                    <option value="title">İsim</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1.5">Yön</div>
                  <button
                    type="button"
                    className="w-full h-9 px-2 rounded border border-gray-200 text-sm text-left hover:bg-gray-50"
                    onClick={() => onSortDirChange?.(sortDir === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDir === 'asc' ? 'Artan ↑' : 'Azalan ↓'}
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          )}

          {/* Add Task Button */}
          <Button
            size="sm"
            className="gap-2 bg-[#6161FF] hover:bg-[#5050E0] text-white min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Görev</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
