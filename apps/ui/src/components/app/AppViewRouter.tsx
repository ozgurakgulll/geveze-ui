import { lazy, Suspense, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { users } from '@/data/mockData';
import type {
  PortfolioCompany,
  PortfolioCompanyDraft,
  PortfolioRole,
  Priority,
  TableColumnSchemaItem,
  Task,
  TaskAttachment,
  TaskStatus,
  ViewType,
} from '@/types';

const DashboardView = lazy(() =>
  import('@/components/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const TableView = lazy(() =>
  import('@/components/TableView').then((m) => ({ default: m.TableView }))
);
const PortfolioView = lazy(() =>
  import('@/components/PortfolioView').then((m) => ({ default: m.PortfolioView }))
);
const BoardView = lazy(() =>
  import('@/components/BoardView').then((m) => ({ default: m.BoardView }))
);
const TimelineView = lazy(() =>
  import('@/components/TimelineView').then((m) => ({ default: m.TimelineView }))
);
const CalendarView = lazy(() =>
  import('@/components/CalendarView').then((m) => ({ default: m.CalendarView }))
);
const PersonView = lazy(() =>
  import('@/components/PersonView').then((m) => ({ default: m.PersonView }))
);
const AnalyticsView = lazy(() =>
  import('@/components/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
const ArchivePage = lazy(() =>
  import('@/components/archive/ArchivePage').then((m) => ({ default: m.ArchivePage }))
);

export interface AppViewRouterProps {
  currentView: ViewType;
  filteredTasks: Task[];
  archivedTasks: Task[];
  tasks: Task[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  tableColumnSchema: TableColumnSchemaItem[];
  setTableColumnSchema: Dispatch<SetStateAction<TableColumnSchemaItem[]>>;
  handleTaskCustomFieldChange: (taskId: string, columnId: string, value: string) => void;
  handleRemoveColumnFromTasks: (columnId: string) => void;
  globalAssigneeFilter: string;
  setGlobalAssigneeFilter: (value: string) => void;
  globalStatusFilter: string;
  setGlobalStatusFilter: (value: string) => void;
  globalSortBy: 'dueDate' | 'priority' | 'title';
  setGlobalSortBy: (value: 'dueDate' | 'priority' | 'title') => void;
  globalSortDir: 'asc' | 'desc';
  setGlobalSortDir: (value: 'asc' | 'desc') => void;
  handleTableTaskAssigneeCommit: (taskId: string, assigneeId: string | null) => void;
  handleTableTaskPriorityCommit: (taskId: string, priority: Priority) => void;
  handleTableTaskStatusCommit: (taskId: string, status: TaskStatus) => void;
  handleTableTaskDescriptionCommit: (taskId: string, description: string) => void;
  handleBulkDeleteTasks: (taskIds: string[]) => void;
  handleBulkReassignTasks: (taskIds: string[], assigneeId: string) => void;
  handleBulkArchiveTasks: (taskIds: string[]) => void;
  handleRestoreFromArchive: (taskIds: string[]) => void;
  portfolioCompaniesState: PortfolioCompany[];
  selectedPortfolioCompanyId: string | null;
  currentUserRole: PortfolioRole;
  canManagePortfolio: boolean;
  handleSelectPortfolioCompany: (companyId: string) => void;
  handleBackToPortfolioOverview: () => void;
  handleCreatePortfolioCompany: (draft: PortfolioCompanyDraft) => void;
  handleUpdatePortfolioCompany: (companyId: string, payload: PortfolioCompanyDraft) => void;
  handleDeletePortfolioCompany: (id: string) => void;
  serviceTypes: string[];
  handleAddServiceType: (name: string) => void;
  handleRemoveServiceType: (name: string) => void;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  handleAddTask: (columnId?: string, dueDate?: Date, assigneeId?: string) => void;
  handleAddQuickBoardTask: (columnId: string) => void;
  handleOpenTaskDetail: (taskId: string) => void;
  handleTaskDatesChange: (taskId: string, startDate: Date, dueDate: Date) => void;
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  setCurrentView: (view: ViewType) => void;
  handleSelectPerson: (personId: string) => void;
  tagServiceMap: Record<string, string>;
  handleAddAttachment: (taskId: string, attachment: TaskAttachment) => void;
}

function ViewFallback() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[200px] text-sm text-gray-500">
      Yükleniyor…
    </div>
  );
}

export function AppViewRouter(props: AppViewRouterProps) {
  const {
    currentView,
    filteredTasks,
    archivedTasks,
    tableColumnSchema,
    setTableColumnSchema,
    handleTaskCustomFieldChange,
    handleRemoveColumnFromTasks,
    globalAssigneeFilter,
    setGlobalAssigneeFilter,
    globalStatusFilter,
    setGlobalStatusFilter,
    globalSortBy,
    setGlobalSortBy,
    globalSortDir,
    setGlobalSortDir,
    handleTableTaskAssigneeCommit,
    handleTableTaskPriorityCommit,
    handleTableTaskStatusCommit,
    handleTableTaskDescriptionCommit,
    handleBulkDeleteTasks,
    handleBulkReassignTasks,
    handleBulkArchiveTasks,
    handleRestoreFromArchive,
    portfolioCompaniesState,
    selectedPortfolioCompanyId,
    currentUserRole,
    canManagePortfolio,
    handleSelectPortfolioCompany,
    handleBackToPortfolioOverview,
    handleCreatePortfolioCompany,
    handleUpdatePortfolioCompany,
    handleDeletePortfolioCompany,
    serviceTypes,
    handleAddServiceType,
    handleRemoveServiceType,
    setTasks,
    handleAddTask,
    handleAddQuickBoardTask,
    handleOpenTaskDetail,
    handleTaskDatesChange,
    selectedPersonId,
    setSelectedPersonId,
    setCurrentView,
    handleSelectPerson,
    tagServiceMap,
    handleAddAttachment,
  } = props;

  let content: ReactNode;
  switch (currentView) {
    case 'dashboard':
      content = <DashboardView tasks={filteredTasks} onTaskClick={handleOpenTaskDetail} />;
      break;
    case 'table':
      content = (
        <TableView
          tasks={filteredTasks}
          onTaskClick={handleOpenTaskDetail}
          tableColumnSchema={tableColumnSchema}
          onTableColumnSchemaChange={setTableColumnSchema}
          onTaskCustomFieldChange={handleTaskCustomFieldChange}
          onRemoveColumnFromTasks={handleRemoveColumnFromTasks}
          assigneeFilter={globalAssigneeFilter}
          onAssigneeFilterChange={setGlobalAssigneeFilter}
          statusFilter={globalStatusFilter}
          onStatusFilterChange={setGlobalStatusFilter}
          sortBy={globalSortBy}
          onSortByChange={setGlobalSortBy}
          sortDir={globalSortDir}
          onSortDirChange={setGlobalSortDir}
          onTaskAssigneeCommit={handleTableTaskAssigneeCommit}
          onTaskPriorityCommit={handleTableTaskPriorityCommit}
          onTaskStatusCommit={handleTableTaskStatusCommit}
          onTaskDescriptionCommit={handleTableTaskDescriptionCommit}
          onBulkDeleteTasks={handleBulkDeleteTasks}
          onBulkReassignTasks={handleBulkReassignTasks}
          onBulkArchiveTasks={handleBulkArchiveTasks}
          onAddTask={handleAddTask}
        />
      );
      break;
    case 'portfolio':
      content = (
        <PortfolioView
          companies={portfolioCompaniesState}
          selectedCompanyId={selectedPortfolioCompanyId}
          currentUserRole={currentUserRole}
          onSelectCompany={handleSelectPortfolioCompany}
          onBackToOverview={handleBackToPortfolioOverview}
          onCreateCompany={handleCreatePortfolioCompany}
          onUpdateCompany={handleUpdatePortfolioCompany}
          onDeleteCompany={handleDeletePortfolioCompany}
          canManageCompanies={canManagePortfolio}
          serviceTypes={serviceTypes}
          onAddServiceType={handleAddServiceType}
          onRemoveServiceType={handleRemoveServiceType}
          tasks={filteredTasks}
          onTaskClick={handleOpenTaskDetail}
        />
      );
      break;
    case 'archive':
      content = (
        <ArchivePage
          tasks={archivedTasks}
          onTaskClick={handleOpenTaskDetail}
          onRestore={handleRestoreFromArchive}
          onPermanentDelete={handleBulkDeleteTasks}
        />
      );
      break;
    case 'board':
      content = (
        <BoardView
          tasks={filteredTasks}
          onTasksChange={setTasks}
          onAddTask={handleAddTask}
          onAddQuickBoardTask={handleAddQuickBoardTask}
          onTaskClick={handleOpenTaskDetail}
          users={users}
          companies={portfolioCompaniesState}
          onAddAttachment={handleAddAttachment}
          tagServiceMap={tagServiceMap}
          onBulkDeleteTasks={handleBulkDeleteTasks}
          onBulkReassignTasks={handleBulkReassignTasks}
          onBulkArchiveTasks={handleBulkArchiveTasks}
          boardSortBy={globalSortBy}
          boardSortDir={globalSortDir}
        />
      );
      break;
    case 'timeline':
      content = (
        <TimelineView
          tasks={filteredTasks}
          onTaskClick={handleOpenTaskDetail}
          onAddTask={handleAddTask}
          onTaskDatesChange={handleTaskDatesChange}
        />
      );
      break;
    case 'calendar':
      content = (
        <CalendarView
          tasks={filteredTasks}
          onAddTask={handleAddTask}
          onTaskClick={handleOpenTaskDetail}
          selectedAssigneeId={selectedPersonId || undefined}
        />
      );
      break;
    case 'person': {
      const selected = users.find((u) => u.id === selectedPersonId) ?? users[0];
      content = selected ? (
        <PersonView
          user={selected}
          tasks={filteredTasks}
          companies={portfolioCompaniesState}
          onTaskClick={handleOpenTaskDetail}
          onCompanySelect={handleSelectPortfolioCompany}
          onBack={() => {
            setSelectedPersonId(null);
            setCurrentView('dashboard');
          }}
        />
      ) : (
        <DashboardView tasks={filteredTasks} onTaskClick={handleOpenTaskDetail} />
      );
      break;
    }
    case 'analytics':
      content = (
        <AnalyticsView
          tasks={filteredTasks}
          companies={portfolioCompaniesState}
          serviceTypes={serviceTypes}
          onTaskClick={handleOpenTaskDetail}
          onPersonSelect={handleSelectPerson}
          onCompanySelect={handleSelectPortfolioCompany}
        />
      );
      break;
    default:
      content = (
        <BoardView
          tasks={filteredTasks}
          onTasksChange={setTasks}
          onAddTask={handleAddTask}
          onAddQuickBoardTask={handleAddQuickBoardTask}
          onTaskClick={handleOpenTaskDetail}
          users={users}
          companies={portfolioCompaniesState}
          onAddAttachment={handleAddAttachment}
          tagServiceMap={tagServiceMap}
          onBulkDeleteTasks={handleBulkDeleteTasks}
          onBulkReassignTasks={handleBulkReassignTasks}
          onBulkArchiveTasks={handleBulkArchiveTasks}
          boardSortBy={globalSortBy}
          boardSortDir={globalSortDir}
        />
      );
  }

  return <Suspense fallback={<ViewFallback />}>{content}</Suspense>;
}
