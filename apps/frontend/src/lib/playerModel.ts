import type { Pose } from '@tempo/shared-types';

/** Fuzzy clip-name hints covering common Mixamo / Blender / VRM naming. */
const CLIP_HINTS: Record<Pose, string[]> = {
  idle: ['idle', 'breathing', 'stand'],
  ready: ['ready', 'idle', 'stance'],
  pass: ['pass', 'bump', 'receive', 'dig'],
  set: ['set', 'overhand', 'volley'],
  serve: ['serve', 'tennis', 'toss'],
  approach_1: ['walk', 'approach', 'jog'],
  approach_2: ['run', 'approach', 'sprint'],
  jump: ['jump', 'vertical', 'leap'],
  spike: ['spike', 'attack', 'hit', 'smash', 'punch'],
  block: ['block'],
  dive: ['dive', 'slide', 'fall'],
  celebrate: ['celebrate', 'cheer', 'clap', 'victory'],
};

export function guessClip(pose: Pose, clips: string[]): string | undefined {
  const lowered = clips.map((name) => ({ name, lower: name.toLowerCase() }));
  for (const hint of CLIP_HINTS[pose]) {
    const exact = lowered.find((clip) => clip.lower === hint);
    if (exact) return exact.name;
  }
  for (const hint of CLIP_HINTS[pose]) {
    const partial = lowered.find((clip) => clip.lower.includes(hint));
    if (partial) return partial.name;
  }
  return undefined;
}

/** Manual mapping wins; otherwise fall back to fuzzy matching on clip names. */
export function resolveClip(
  pose: Pose,
  clips: string[],
  clipMap: Partial<Record<Pose, string>>,
): string | undefined {
  const mapped = clipMap[pose];
  if (mapped && clips.includes(mapped)) return mapped;
  return guessClip(pose, clips);
}
