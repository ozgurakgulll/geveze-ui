import type { TaskStatus } from '@/types';

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

export const STATUS_LABELS: Record<string, string> = {
  brief: 'Planlandı',
  'in-progress': 'Çalışılıyor',
  review: 'İncelemede',
  revision: 'Revizyonda',
  done: 'Tamamlandı',
};

export const STATUS_COLORS: Record<string, string> = {
  brief: '#64748B',
  'in-progress': '#F59E0B',
  review: '#6366F1',
  revision: '#EF4444',
  done: '#10B981',
};

export const COLUMN_DEFINITIONS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'brief',       title: 'Planlandı',   color: '#64748B' },
  { id: 'in-progress', title: 'Çalışılıyor', color: '#F59E0B' },
  { id: 'review',      title: 'İncelemede',  color: '#6366F1' },
  { id: 'revision',    title: 'Revizyonda',  color: '#EF4444' },
  { id: 'done',        title: 'Tamamlandı',  color: '#10B981' },
];
