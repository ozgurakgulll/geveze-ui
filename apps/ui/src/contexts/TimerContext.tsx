import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { TimeEntry } from '@geveze/shared';
import * as api from '@/lib/api';

interface TimerContextValue {
  activeTimer: TimeEntry | null;
  elapsedSeconds: number;
  isLoading: boolean;
  startTimer: (taskId: string, taskTitle: string, workspaceId?: string, portfolioCompanyId?: string) => Promise<void>;
  stopTimer: (note?: string) => Promise<TimeEntry | null>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeElapsed = (timer: TimeEntry | null) => {
    if (!timer) return 0;
    return Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
  };

  const startTick = useCallback((timer: TimeEntry) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsedSeconds(computeElapsed(timer));
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(computeElapsed(timer));
    }, 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedSeconds(0);
  }, []);

  // Sayfa yenilenince aktif timer'ı geri yükle
  useEffect(() => {
    api.getActiveTimer()
      .then((entry) => {
        if (entry) {
          setActiveTimer(entry);
          startTick(entry);
        }
      })
      .catch(() => {/* kullanıcı giriş yapmamış olabilir */});

    return () => stopTick();
  }, [startTick, stopTick]);

  const startTimer = useCallback(async (
    taskId: string,
    taskTitle: string,
    workspaceId?: string,
    portfolioCompanyId?: string,
  ) => {
    setIsLoading(true);
    try {
      const entry = await api.startTimer(taskId, taskTitle, workspaceId, portfolioCompanyId);
      setActiveTimer(entry);
      startTick(entry);
    } finally {
      setIsLoading(false);
    }
  }, [startTick]);

  const stopTimer = useCallback(async (note?: string): Promise<TimeEntry | null> => {
    if (!activeTimer) return null;
    setIsLoading(true);
    try {
      const entry = await api.stopTimer(note);
      setActiveTimer(null);
      stopTick();
      return entry;
    } finally {
      setIsLoading(false);
    }
  }, [activeTimer, stopTick]);

  return (
    <TimerContext.Provider value={{ activeTimer, elapsedSeconds, isLoading, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
  return ctx;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}s ${m}d`;
  if (h > 0) return `${h}s`;
  return `${m}d`;
}
