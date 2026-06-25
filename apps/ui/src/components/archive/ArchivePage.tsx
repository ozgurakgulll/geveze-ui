import { Archive } from 'lucide-react';
import type { Task } from '@/types';
import { ArchiveList } from './ArchiveList';

export interface ArchivePageProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onRestore: (taskIds: string[]) => void;
  onPermanentDelete: (taskIds: string[]) => void;
}

export function ArchivePage({
  tasks,
  onTaskClick,
  onRestore,
  onPermanentDelete,
}: ArchivePageProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Arşiv</h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-500">
            Arşivlenen görevler ana listede görünmez. İstediğiniz zaman geri alabilir veya kalıcı olarak
            silebilirsiniz.
          </p>
        </header>

        {tasks.length === 0 ? (
          <div
            className={[
              'flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60',
              'px-8 py-20 text-center shadow-sm transition-colors duration-300',
              'animate-in fade-in zoom-in-95 duration-300',
            ].join(' ')}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Archive className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-700">Arşivde görev yok</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              Ana tablodan görevleri arşivlediğinizde burada listelenir.
            </p>
          </div>
        ) : (
          <ArchiveList
            tasks={tasks}
            onTaskClick={onTaskClick}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
          />
        )}
      </div>
    </div>
  );
}
