export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : (v - a) / (b - a);
}

/** Lerp between angles expressed in degrees, taking the shortest path. */
export function lerpAngleDeg(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

export const EASINGS = ['linear', 'easeIn', 'easeOut', 'easeInOut'] as const;
export type Easing = (typeof EASINGS)[number];

export function easeIn(t: number): number {
  return t * t;
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function applyEasing(easing: Easing, t: number): number {
  const c = clamp(t, 0, 1);
  switch (easing) {
    case 'easeIn':
      return easeIn(c);
    case 'easeOut':
      return easeOut(c);
    case 'easeInOut':
      return easeInOut(c);
    case 'linear':
    default:
      return c;
  }
}

export function roundTo(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
