import { z } from 'zod';

/** A point in 3D space, meters. Court origin is the center of the net on the floor. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Compact tuple form used on the wire / stored in JSONB for camera states. */
export type Vec3Tuple = [number, number, number];

export const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const Vec3TupleSchema = z.tuple([z.number(), z.number(), z.number()]);

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function lerpTuple(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function roundVec3(v: Vec3, decimals = 3): Vec3 {
  const f = 10 ** decimals;
  return { x: Math.round(v.x * f) / f, y: Math.round(v.y * f) / f, z: Math.round(v.z * f) / f };
}

export const FloorPointSchema = z.object({ x: z.number(), z: z.number() });
export type FloorPoint = z.infer<typeof FloorPointSchema>;
