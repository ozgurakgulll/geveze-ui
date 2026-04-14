import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import type { Task } from '@/types';
import { ArchiveTaskItem } from './ArchiveTaskItem';
import { Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArchiveListProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onRestore: (taskIds: string[]) => void;
  onPermanentDelete: (taskIds: string[]) => void;
}

export function ArchiveList({
  tasks,
  onTaskClick,
  onRestore,
  onPermanentDelete,
}: ArchiveListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    const valid = new Set(tasks.map((t) => t.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [tasks]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t.id));
    }
  }, [tasks, selectedIds.length]);

  const clearDeleteConfirm = useCallback(() => setDeleteConfirmIds(null), []);

  const confirmPermanentDelete = useCallback(() => {
    if (!deleteConfirmIds?.length) return;
    onPermanentDelete(deleteConfirmIds);
    setSelectedIds((prev) => prev.filter((id) => !deleteConfirmIds.includes(id)));
    setDeleteConfirmIds(null);
  }, [deleteConfirmIds, onPermanentDelete]);

  const handleBulkRestore = useCallback(() => {
    if (selectedIds.length === 0) return;
    onRestore([...selectedIds]);
    setSelectedIds([]);
  }, [selectedIds, onRestore]);

  const handleBulkDeleteRequest = useCallback(() => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmIds([...selectedIds]);
  }, [selectedIds]);

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;
  const someSelected = selectedIds.length > 0;

  return (
    <div className="space-y-4">
      {someSelected && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm',
            'animate-in fade-in slide-in-from-top-1 duration-200'
          )}
        >
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.length} seçili
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-gray-200 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleBulkRestore}
            >
              <Undo2 className="h-4 w-4" />
              Arşivden çıkar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleBulkDeleteRequest}
            >
              <Trash2 className="h-4 w-4" />
              Kalıcı sil
            </Button>
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[#6161FF] focus:ring-[#6161FF]"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={selectAll}
          />
          <span>Tümünü seç</span>
        </label>
      )}

      <ul className="space-y-2">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className="animate-in fade-in duration-300"
            style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
          >
            <ArchiveTaskItem
              task={task}
              selected={selectedSet.has(task.id)}
              onToggleSelect={() => toggle(task.id)}
              onOpenDetail={() => onTaskClick(task.id)}
              onRestore={() => onRestore([task.id])}
              onRequestPermanentDelete={() => setDeleteConfirmIds([task.id])}
            />
          </li>
        ))}
      </ul>

      <AlertDialog open={deleteConfirmIds !== null} onOpenChange={(o) => !o && clearDeleteConfirm()}>
        <AlertDialogContent className="rounded-xl border-gray-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Kalıcı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmIds && deleteConfirmIds.length === 1
                ? 'Bu görev kalıcı olarak silinecek. Bu işlem geri alınamaz.'
                : `${deleteConfirmIds?.length ?? 0} görev kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                confirmPermanentDelete();
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
