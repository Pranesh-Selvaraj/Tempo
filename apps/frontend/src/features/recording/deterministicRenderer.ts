import type { PerspectiveCamera } from 'three';
import { flushSync } from 'react-dom';
import { bridge } from '../../lib/bridge';
import { useEditorStore } from '../../stores/editorStore';
import { useTimelineStore } from '../../stores/timelineStore';
import type { ExportPreset } from './exportPresets';
import type { RecordingResult } from './useRecorder';

interface CodecOption {
  encoderCodec: string;
  muxerCodec: 'avc' | 'vp9' | 'av1' | 'hevc';
  label: string;
}

const CODEC_CANDIDATES: CodecOption[] = [
  { encoderCodec: 'avc1.640028', muxerCodec: 'avc', label: 'H.264 High' },
  { encoderCodec: 'avc1.4d0028', muxerCodec: 'avc', label: 'H.264 Main' },
  { encoderCodec: 'avc1.42E01E', muxerCodec: 'avc', label: 'H.264 Baseline' },
  { encoderCodec: 'vp09.00.10.08', muxerCodec: 'vp9', label: 'VP9' },
  { encoderCodec: 'av01.0.04M.08', muxerCodec: 'av1', label: 'AV1' },
];

export function supportsStudioRender(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && bridge.root !== null;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function pickCodec(preset: ExportPreset): Promise<CodecOption | null> {
  for (const candidate of CODEC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: candidate.encoderCodec,
        width: preset.width,
        height: preset.height,
        bitrate: preset.videoBitsPerSecond || 6_000_000,
        framerate: preset.fps,
      });
      if (support.supported) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export interface StudioProgress {
  phase: 'rendering' | 'finalizing';
  frame: number;
  totalFrames: number;
}

export interface StudioRenderOptions {
  durationMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: StudioProgress) => void;
}

/**
 * Frame-perfect render: for every output frame the timeline is placed at an
 * exact timestamp, the scene is advanced once, and the frame is encoded with
 * WebCodecs. Because playback state is a pure function of (keyframes, currentMs),
 * the result is byte-for-byte reproducible — unlike the realtime recorder.
 */
export async function renderDeterministic(
  preset: ExportPreset,
  options: StudioRenderOptions,
): Promise<RecordingResult> {
  const root = bridge.root;
  const canvas = bridge.canvas;
  if (!root || !canvas) throw new Error('The 3D scene is not ready yet');

  const { ArrayBufferTarget, Muxer } = await import('mp4-muxer');

  const codec = await pickCodec(preset);
  if (!codec) throw new Error('This browser cannot encode MP4 video (WebCodecs H.264/VP9 unavailable)');

  const fps = preset.fps;
  const totalFrames = Math.max(1, Math.ceil((options.durationMs / 1000) * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  const camera = root.camera as PerspectiveCamera;
  const previous = {
    size: { width: root.size.width, height: root.size.height },
    dpr: root.viewport.dpr,
    aspect: camera.aspect,
    currentMs: useTimelineStore.getState().currentMs,
  };

  useTimelineStore.getState().setPlaying(false);
  useTimelineStore.getState().setCurrent(0);

  // Render at exactly the export resolution, ignoring the on-screen size.
  root.setDpr(1);
  root.setSize(preset.width, preset.height, false);
  camera.aspect = preset.width / preset.height;
  camera.updateProjectionMatrix();
  // Two frames let R3F and the post-processing composer apply the new size.
  await nextAnimationFrame();
  await nextAnimationFrame();

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: codec.muxerCodec,
      width: preset.width,
      height: preset.height,
      frameRate: fps,
    },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error instanceof Error ? error : new Error(String(error));
    },
  });
  encoder.configure({
    codec: codec.encoderCodec,
    width: preset.width,
    height: preset.height,
    bitrate: preset.videoBitsPerSecond || 6_000_000,
    framerate: fps,
    latencyMode: 'quality',
  });

  try {
    for (let index = 0; index < totalFrames; index += 1) {
      if (options.signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
      if (encoderError) throw encoderError;

      // flushSync guarantees the scene graph reflects this exact timestamp
      // before the single advance() that renders the frame.
      flushSync(() => {
        useTimelineStore.getState().setCurrent((index / fps) * 1000);
      });
      root.advance(performance.now(), true);

      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((index * 1_000_000) / fps),
        duration: frameDurationUs,
      });
      encoder.encode(frame, { keyFrame: index % Math.max(1, Math.round(fps * 2)) === 0 });
      frame.close();

      while (encoder.encodeQueueSize > 6) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (options.signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
        if (encoderError) throw encoderError;
      }

      options.onProgress?.({ phase: 'rendering', frame: index + 1, totalFrames });

      // Yield to the browser so the progress UI keeps painting during long renders.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    options.onProgress?.({ phase: 'finalizing', frame: totalFrames, totalFrames });
    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
    try {
      root.setDpr(previous.dpr);
      root.setSize(previous.size.width, previous.size.height, true);
      camera.aspect = previous.aspect;
      camera.updateProjectionMatrix();
    } catch (restoreError) {
      console.error('Could not restore the renderer after a studio render', restoreError);
    }
    useTimelineStore.getState().setCurrent(previous.currentMs);
    useEditorStore.getState().setRenderJobActive(false);
  }

  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  return {
    url: URL.createObjectURL(blob),
    blob,
    preset,
    durationMs: options.durationMs,
    extension: 'mp4',
  };
}
