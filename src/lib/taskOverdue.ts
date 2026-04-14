import { addHours, differenceInCalendarDays, endOfDay } from 'date-fns';
import type { Task } from '@/types';

/** Son teslim günü bittikten sonra eklenen süre (saat); bu süre dolmadan görev gecikmiş sayılmaz. */
export const OVERDUE_GRACE_HOURS = 12;

/**
 * Gecikme eşiği: son teslim gününün sonu (23:59:59) + grace saat.
 * Bu zaman damgasından sonra görev gecikmiş kabul edilir.
 */
export function getTaskOverdueThreshold(task: Task): Date | null {
  if (!task.dueDate) return null;
  return addHours(endOfDay(task.dueDate), OVERDUE_GRACE_HOURS);
}

/** Tamamlanmamış ve son teslim + grace süresi geçmiş görevler. */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.status === 'done') return false;
  const threshold = getTaskOverdueThreshold(task);
  if (!threshold) return false;
  return now.getTime() > threshold.getTime();
}

/**
 * Görüntü için: gecikmiş ise son teslim gününden bugüne tam takvim günü farkı (yaklaşık).
 */
export function getOverdueCalendarDaysFromDue(task: Task, now: Date = new Date()): number {
  if (!task.dueDate || task.status === 'done') return 0;
  if (!isTaskOverdue(task, now)) return 0;
  return Math.max(0, differenceInCalendarDays(now, task.dueDate));
}
