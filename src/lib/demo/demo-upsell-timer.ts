const STORAGE_KEY = "reglow_demo_upsell_v1";
export const DEMO_SEGMENT_MS = 5 * 60 * 1000;

export type DemoUpsellState = {
  startedAt: number;
  /** Each unit = one extra 5-minute segment after the first. */
  extraSegments: number;
};

export function loadDemoUpsellState(): DemoUpsellState {
  if (typeof window === "undefined") {
    return { startedAt: Date.now(), extraSegments: 0 };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoUpsellState;
      if (typeof parsed.startedAt === "number" && typeof parsed.extraSegments === "number") {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  const initial = { startedAt: Date.now(), extraSegments: 0 };
  saveDemoUpsellState(initial);
  return initial;
}

export function saveDemoUpsellState(state: DemoUpsellState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDemoUpsellDeadline(state: DemoUpsellState): number {
  return state.startedAt + (1 + state.extraSegments) * DEMO_SEGMENT_MS;
}

export function msUntilDemoUpsell(state: DemoUpsellState): number {
  return Math.max(0, getDemoUpsellDeadline(state) - Date.now());
}

export function extendDemoByMinutes(state: DemoUpsellState, minutes: number): DemoUpsellState {
  const segments = Math.max(1, Math.round(minutes / 5));
  const next = { ...state, extraSegments: state.extraSegments + segments };
  saveDemoUpsellState(next);
  return next;
}

export function resetDemoUpsellSegment(): DemoUpsellState {
  const next = { startedAt: Date.now(), extraSegments: 0 };
  saveDemoUpsellState(next);
  return next;
}

export function clearDemoUpsellState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
