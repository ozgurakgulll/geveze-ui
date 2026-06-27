import { useCallback, useMemo, useState } from 'react';
import { Trash2, Undo2, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS as priorityColors, PRIORITY_LABELS as priorityLabels } from '@/lib/constants';
import type { PortfolioCompany, Task } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface RecentlyDeletedPageProps {
  tasks: Task[];
  onRestore: (taskId: string) => void;
  onPermanentDelete?: (taskId: string) => void;
  onBulkRestore: (ids: string[]) => void;
  onBulkPermanentDelete: (ids: string[]) => void;
  deletedCompanies?: PortfolioCompany[];
  onRestoreCompany?: (id: string) => void;
  onPermanentDeleteCompany?: (id: string) => void;
}

function daysRemaining(deletedAt: string | null | undefined): number {
  if (!deletedAt) return 30;
  return Math.max(0, 30 - differenceInDays(new Date(), new Date(deletedAt)));
}

function DaysRemainingBadge({ days }: { days: number }) {
  if (days <= 3) return <Badge className="bg-red-100 text-red-700 text-[10px]">{days} gün kaldı</Badge>;
  if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">{days} gün kaldı</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 text-[10px]">{days} gün kaldı</Badge>;
}

export function RecentlyDeletedPage({
  tasks,
  onRestore,
  onBulkRestore,
  onBulkPermanentDelete,
  deletedCompanies = [],
  onRestoreCompany,
  onPermanentDeleteCompany,
}: RecentlyDeletedPageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [companyDeleteConfirmId, setCompanyDeleteConfirmId] = useState<string | null>(null);
  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;
  const someSelected = selectedIds.length > 0;

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(allSelected ? [] : tasks.map((t) => t.id));
  }, [allSelected, tasks]);

  const handleBulkRestore = useCallback(() => {
    onBulkRestore([...selectedIds]);
    setSelectedIds([]);
  }, [selectedIds, onBulkRestore]);

  const handleBulkDeleteRequest = useCallback(() => {
    setDeleteConfirmIds([...selectedIds]);
  }, [selectedIds]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmIds?.length) return;
    onBulkPermanentDelete(deleteConfirmIds);
    setSelectedIds((prev) => prev.filter((id) => !deleteConfirmIds.includes(id)));
    setDeleteConfirmIds(null);
  }, [deleteConfirmIds, onBulkPermanentDelete]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-gray-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Son Silinenler</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-xl">
            Silinen görevler 30 gün boyunca burada saklanır. Süre dolunca otomatik olarak kalıcı silinir.
          </p>
        </div>

        {/* Warning banner */}
        {tasks.some((t) => daysRemaining(t.deletedAt) <= 3) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Bazı görevler 3 gün içinde kalıcı olarak silinecek.</span>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 px-8 py-20 text-center shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Trash2 className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-700">Son silinenler boş</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              Silinen görevler 30 gün boyunca burada görünür.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bulk actions */}
            {tasks.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[#6161FF] focus:ring-[#6161FF]"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={selectAll}
                  />
                  <span>Tümünü seç</span>
                </label>

                {someSelected && (
                  <div className="ml-auto flex gap-2 animate-in fade-in duration-150">
                    <span className="text-sm text-gray-500 self-center">{selectedIds.length} seçili</span>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkRestore}>
                      <Undo2 className="h-4 w-4" /> Geri Al
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleBulkDeleteRequest}
                    >
                      <Trash2 className="h-4 w-4" /> Kalıcı Sil
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Task list */}
            <ul className="space-y-2">
              {tasks.map((task, index) => {
                const days = daysRemaining(task.deletedAt);
                return (
                  <li
                    key={task.id}
                    className="animate-in fade-in duration-300"
                    style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all',
                        'hover:border-gray-200 hover:shadow-md',
                        selectedSet.has(task.id) && 'border-[#6161FF]/30 bg-[#6161FF]/[0.04] ring-1 ring-[#6161FF]/20'
                      )}
                    >
                      {tasks.length > 1 && (
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#6161FF] focus:ring-[#6161FF]"
                          checked={selectedSet.has(task.id)}
                          onChange={() => toggle(task.id)}
                        />
                      )}

                      <span
                        className="h-2 w-2 shrink-0 rounded-full mt-0.5"
                        style={{ backgroundColor: priorityColors[task.priority] }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 line-through decoration-gray-400">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.deletedAt
                              ? format(new Date(task.deletedAt), 'd MMM yyyy', { locale: tr }) + ' silindi'
                              : 'Silindi'}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{priorityLabels[task.priority]}</span>
                        </div>
                      </div>

                      <DaysRemainingBadge days={days} />

                      {task.assignee && (
                        <Avatar className="h-6 w-6 shrink-0" style={{ backgroundColor: task.assignee.color }}>
                          <AvatarFallback className="text-[10px] text-white">{task.assignee.initials}</AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-[#6161FF] hover:bg-[#6161FF]/10"
                          onClick={() => onRestore(task.id)}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1" />
                          Geri Al
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirmIds([task.id])}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Silinen Portföy Şirketleri */}
      {deletedCompanies.length > 0 && (
        <div className="mx-auto max-w-4xl space-y-3 mt-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-700">Silinen Portföy Şirketleri</h2>
          </div>
          <ul className="space-y-2">
            {deletedCompanies.map((c) => (
              <li key={c.id}>
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 line-through decoration-gray-400">{c.name}</p>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.deletedAt
                        ? format(new Date(c.deletedAt as string), 'd MMM yyyy', { locale: tr }) + ' silindi'
                        : 'Silindi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onRestoreCompany && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#6161FF] hover:bg-[#6161FF]/10"
                        onClick={() => onRestoreCompany(c.id)}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1" />Geri Al
                      </Button>
                    )}
                    {onPermanentDeleteCompany && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => setCompanyDeleteConfirmId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={companyDeleteConfirmId !== null} onOpenChange={(o) => !o && setCompanyDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-xl border-gray-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Şirket kalıcı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); if (companyDeleteConfirmId) { onPermanentDeleteCompany?.(companyDeleteConfirmId); setCompanyDeleteConfirmId(null); } }}
            >
              Kalıcı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmIds !== null} onOpenChange={(o) => !o && setDeleteConfirmIds(null)}>
        <AlertDialogContent className="rounded-xl border-gray-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Kalıcı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmIds?.length === 1
                ? 'Bu görev kalıcı olarak silinecek. Bu işlem geri alınamaz.'
                : `${deleteConfirmIds?.length ?? 0} görev kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              Kalıcı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
