import type { Priority, TaskStatus } from '@/types';

interface TaskProgressInput {
  status: TaskStatus;
  priority?: Priority;
  progress?: number;
}

const URGENT_RED_GRADIENT = 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)';
const DEFAULT_BLUE_GRADIENT = 'linear-gradient(90deg, #6161FF 0%, #4F46E5 100%)';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function getTaskProgress(task: TaskProgressInput, now = new Date()) {
  void now;
  switch (task.status) {
    case 'brief':
      return 5;
    case 'in-progress':
      return 50;
    case 'review':
      return 75;
    case 'done':
      return 100;
    case 'revision':
      return clamp(task.progress ?? 5, 0, 100);
    default:
      return 5;
  }
}

export function getTaskProgressGradient(task: TaskProgressInput, now = new Date()) {
  void now;
  if (task.priority === 'urgent') {
    return URGENT_RED_GRADIENT;
  }
  return DEFAULT_BLUE_GRADIENT;
}
