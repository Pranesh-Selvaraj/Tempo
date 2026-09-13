import { useCallback, useRef, useState } from 'react';
import { clamp } from '@tempo/shared-types';
import { bridge } from '../../lib/bridge';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore, type PlaybackSpeed } from '../../stores/timelineStore';
import { EXPORT_PRESETS, scaleFilter, type ExportPreset } from './exportPresets';

export type RecorderStatus = 'idle' | 'recording' | 'encoding' | 'done' | 'error';

export interface RecordingResult {
  url: string;
  blob: Blob;
  preset: ExportPreset;
  durationMs: number;
  extension: string;
}

const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

/**
 * Records the WebGL canvas in real time with MediaRecorder, then transcodes
 * with ffmpeg.wasm. ffmpeg.wasm requires cross-origin isolation — the Vite dev
 * server and the API both send COOP/COEP headers.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const ffmpegRef = useRef<Awaited<ReturnType<typeof loadFfmpegModule>> | null>(null);
  const createRecording = trpc.recording.create.useMutation();

  const getFfmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = await loadFfmpegModule(setProgress);
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const saveMetadata = useCallback(
    (preset: ExportPreset, durationMs: number, blob: Blob) => {
      const play = usePlayStore.getState().play;
      if (!play) return;
      createRecording.mutate(
        {
          playId: play.id,
          format: preset.format,
          preset: preset.id,
          durationMs,
          fileSizeBytes: blob.size,
          fileUrl: null,
          thumbnailUrl: null,
        },
        { onError: (mutationError) => console.error('Could not save recording metadata', mutationError) },
      );
    },
    [createRecording],
  );

  const exportGlb = useCallback(async () => {
    const scene = bridge.scene;
    if (!scene) throw new Error('The 3D scene is not ready yet');
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    const data = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        scene,
        (output) => {
          if (output instanceof ArrayBuffer) resolve(output);
          else reject(new Error('Unexpected GLB export output'));
        },
        (exportError) => reject(exportError),
        { binary: true },
      );
    });
    const blob = new Blob([data], { type: 'model/gltf-binary' });
    const preset = EXPORT_PRESETS.glb;
    setResult({ url: URL.createObjectURL(blob), blob, preset, durationMs: 0, extension: 'glb' });
    setStatus('done');
    saveMetadata(preset, 0, blob);
  }, [saveMetadata]);

  const record = useCallback(
    async (preset: ExportPreset) => {
      setError(null);
      setResult(null);
      setProgress(0);

      if (preset.format === 'glb') {
        setStatus('encoding');
        try {
          await exportGlb();
        } catch (glbError) {
          setError(glbError instanceof Error ? glbError.message : String(glbError));
          setStatus('error');
        }
        return;
      }

      const canvas = bridge.canvas;
      if (!canvas) {
        setError('The 3D canvas is not ready yet');
        setStatus('error');
        return;
      }

      const editor = useEditorStore.getState();
      const timeline = useTimelineStore.getState();
      const durationMs = Math.min(usePlayStore.getState().durationMs, preset.maxSeconds * 1000);
      if (durationMs <= 0) {
        setError('Give the play some duration before exporting');
        setStatus('error');
        return;
      }

      try {
        setStatus('recording');
        editor.setRecordingFrame({ active: true, width: preset.width, height: preset.height });
        timeline.setPlaying(false);
        timeline.setSpeed(preset.speed as PlaybackSpeed);
        timeline.setCurrent(0);

        // Give the canvas one frame to resize into the export aspect ratio.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const stream = canvas.captureStream(preset.fps);
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: preset.videoBitsPerSecond,
        });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        const stopped = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });

        recorder.start(100);
        useTimelineStore.getState().setPlaying(true);

        await new Promise<void>((resolve) => {
          const wallLimitMs = durationMs / preset.speed + 20_000;
          const startedAt = performance.now();
          const check = () => {
            const state = useTimelineStore.getState();
            if (!state.playing || state.currentMs >= durationMs || performance.now() - startedAt > wallLimitMs) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        });

        useTimelineStore.getState().setPlaying(false);
        await new Promise((resolve) => setTimeout(resolve, 150));
        recorder.stop();
        await stopped;
        stream.getTracks().forEach((track) => track.stop());

        const webmBlob = new Blob(chunks, { type: mimeType });
        useEditorStore.getState().setRecordingFrame({ active: false });
        useTimelineStore.getState().setSpeed(1);

        let blob = webmBlob;
        let extension = 'webm';

        if (preset.format === 'mp4' || preset.format === 'gif') {
          setStatus('encoding');
          const ffmpeg = await getFfmpeg();
          const { fetchFile } = await import('@ffmpeg/util');
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

          if (preset.format === 'mp4') {
            await ffmpeg.exec([
              '-fflags',
              '+genpts',
              '-i',
              'input.webm',
              '-t',
              String(preset.maxSeconds),
              '-vf',
              scaleFilter(preset),
              '-r',
              String(preset.fps),
              '-c:v',
              'libx264',
              '-preset',
              'veryfast',
              '-crf',
              String(preset.crf),
              '-pix_fmt',
              'yuv420p',
              '-movflags',
              '+faststart',
              'output.mp4',
            ]);
            blob = await readFfmpegFile(ffmpeg, 'output.mp4', 'video/mp4');
            extension = 'mp4';
          } else {
            await ffmpeg.exec([
              '-i',
              'input.webm',
              '-t',
              String(preset.maxSeconds),
              '-vf',
              `fps=${preset.fps},${scaleFilter(preset)},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
              '-loop',
              '0',
              'output.gif',
            ]);
            blob = await readFfmpegFile(ffmpeg, 'output.gif', 'image/gif');
            extension = 'gif';
          }
        }

        const url = URL.createObjectURL(blob);
        setResult({ url, blob, preset, durationMs, extension });
        setStatus('done');
        saveMetadata(preset, durationMs, blob);
      } catch (recordError) {
        console.error('Recording failed', recordError);
        useEditorStore.getState().setRecordingFrame({ active: false });
        useTimelineStore.getState().setSpeed(1);
        setError(recordError instanceof Error ? recordError.message : String(recordError));
        setStatus('error');
      }
    },
    [exportGlb, getFfmpeg, saveMetadata],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return { status, progress, error, result, record, exportGlb, reset };
}

async function loadFfmpegModule(onProgress: (value: number) => void) {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => onProgress(clamp(progress, 0, 1)));
  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
}

type FfmpegInstance = Awaited<ReturnType<typeof loadFfmpegModule>>;

async function readFfmpegFile(ffmpeg: FfmpegInstance, name: string, type: string): Promise<Blob> {
  const data = await ffmpeg.readFile(name);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  return new Blob([bytes as BlobPart], { type });
}
