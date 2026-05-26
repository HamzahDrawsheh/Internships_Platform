"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CYCLE_MS = 6000;
const TICK_MS = 50;

type ContextValue = {
  cycleStep: number;
  fadeKey: number;
  progress: number;
  setCycleStep: (step: number) => void;
  cycleMs: number;
};

const DashboardCyclicSyncContext = createContext<ContextValue | null>(null);

export function DashboardCyclicSyncProvider({ children }: { children: ReactNode }) {
  const [cycleStep, setCycleStepState] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [progress, setProgress] = useState(0);

  const setCycleStep = useCallback((step: number) => {
    setCycleStepState(step);
    setFadeKey((k) => k + 1);
    setProgress(0);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((p) => {
        const next = p + (TICK_MS / CYCLE_MS) * 100;
        if (next >= 100) {
          setCycleStepState((s) => s + 1);
          setFadeKey((k) => k + 1);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  const value = useMemo(
    () => ({ cycleStep, fadeKey, progress, setCycleStep, cycleMs: CYCLE_MS }),
    [cycleStep, fadeKey, progress, setCycleStep]
  );

  return (
    <DashboardCyclicSyncContext.Provider value={value}>{children}</DashboardCyclicSyncContext.Provider>
  );
}

export function useDashboardCyclicSync() {
  const ctx = useContext(DashboardCyclicSyncContext);
  if (!ctx) {
    throw new Error("useDashboardCyclicSync must be used within DashboardCyclicSyncProvider");
  }
  return ctx;
}

export function DashboardCyclicControls({ slideCount = 3 }: { slideCount?: number }) {
  const { cycleStep, progress, setCycleStep } = useDashboardCyclicSync();
  const active = slideCount > 0 ? ((cycleStep % slideCount) + slideCount) % slideCount : 0;

  return (
    <div className="flex items-center gap-3 pt-1">
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-75 ease-linear dark:from-violet-400 dark:to-fuchsia-400"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show insight ${i + 1}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => setCycleStep(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "h-2 w-6 bg-violet-600 dark:bg-violet-400"
                : "h-2 w-2 bg-violet-300/90 hover:bg-violet-400 dark:bg-violet-700 dark:hover:bg-violet-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
