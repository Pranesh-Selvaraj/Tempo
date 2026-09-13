import { CatmullRomCurve3, Vector3 } from 'three';
import { BALL_RADIUS, type Vec3 } from '@tempo/shared-types';

const cache = new Map<string, CatmullRomCurve3>();

function pointKey(p: Vec3): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
}

export function controlPointsKey(points: Vec3[]): string {
  return points.map(pointKey).join('|');
}

/** Cached Catmull-Rom curve for authored control points. */
export function curveFor(points: Vec3[]): CatmullRomCurve3 {
  const key = controlPointsKey(points);
  const cached = cache.get(key);
  if (cached) return cached;

  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p.x, p.y, p.z)),
    false,
    'catmullrom',
    0.5,
  );
  cache.set(key, curve);
  if (cache.size > 256) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return curve;
}

/** Where the ball first drops through the ball-radius height — the landing spot. */
export function landingPoint(points: Vec3[]): Vector3 | null {
  if (points.length < 2) return null;
  const curve = curveFor(points);
  const samples = 160;
  let previous = curve.getPointAt(0);
  for (let i = 1; i <= samples; i += 1) {
    const current = curve.getPointAt(i / samples);
    if (previous.y > BALL_RADIUS && current.y <= BALL_RADIUS) {
      const t = (previous.y - BALL_RADIUS) / Math.max(0.0001, previous.y - current.y);
      const landing = previous.clone().lerp(current, t);
      return new Vector3(landing.x, 0, landing.z);
    }
    previous = current;
  }
  return null;
}

export function curveLength(points: Vec3[]): number {
  if (points.length < 2) return 0;
  return curveFor(points).getLength();
}
