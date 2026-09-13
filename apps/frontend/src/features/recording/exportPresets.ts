import type { RecordingFormat, RecordingPresetId } from '@tempo/shared-types';

export interface ExportPreset {
  id: RecordingPresetId;
  label: string;
  description: string;
  format: RecordingFormat;
  width: number;
  height: number;
  fps: number;
  crf: number;
  videoBitsPerSecond: number;
  maxSeconds: number;
  speed: number;
  aspect: string;
}

export const EXPORT_PRESETS: Record<RecordingPresetId, ExportPreset> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: '720×720 square · 30 fps · 20 s · small file',
    format: 'mp4',
    width: 720,
    height: 720,
    fps: 30,
    crf: 26,
    videoBitsPerSecond: 2_500_000,
    maxSeconds: 20,
    speed: 1,
    aspect: '1 / 1',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram / Reels',
    description: '1080×1920 vertical · 30 fps · 60 s',
    format: 'mp4',
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 24,
    videoBitsPerSecond: 6_000_000,
    maxSeconds: 60,
    speed: 1,
    aspect: '9 / 16',
  },
  presentation: {
    id: 'presentation',
    label: 'Presentation',
    description: '1920×1080 landscape · 60 fps · 120 s',
    format: 'mp4',
    width: 1920,
    height: 1080,
    fps: 60,
    crf: 20,
    videoBitsPerSecond: 12_000_000,
    maxSeconds: 120,
    speed: 1,
    aspect: '16 / 9',
  },
  slowmo: {
    id: 'slowmo',
    label: 'Slow motion',
    description: '1080×1080 · 0.25× speed · great for technique',
    format: 'mp4',
    width: 1080,
    height: 1080,
    fps: 60,
    crf: 22,
    videoBitsPerSecond: 8_000_000,
    maxSeconds: 30,
    speed: 0.25,
    aspect: '1 / 1',
  },
  gif: {
    id: 'gif',
    label: 'GIF',
    description: '480×480 loopable · 15 fps · 8 s',
    format: 'gif',
    width: 480,
    height: 480,
    fps: 15,
    crf: 0,
    videoBitsPerSecond: 3_000_000,
    maxSeconds: 8,
    speed: 1,
    aspect: '1 / 1',
  },
  glb: {
    id: 'glb',
    label: '3D model (GLB)',
    description: 'Export the whole scene as a GLB model',
    format: 'glb',
    width: 1920,
    height: 1080,
    fps: 30,
    crf: 0,
    videoBitsPerSecond: 0,
    maxSeconds: 0,
    speed: 1,
    aspect: '16 / 9',
  },
};

export const EXPORT_PRESET_LIST: ExportPreset[] = Object.values(EXPORT_PRESETS);

/** Fill the canvas aspect with the target frame, letterboxing when needed. */
export function scaleFilter(preset: ExportPreset): string {
  return `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2:color=black`;
}
