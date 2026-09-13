import { useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import {
  registerRenderAbort,
  releaseRenderJob,
  useRenderQueueStore,
} from '../../stores/renderQueueStore';
import { renderDeterministic, supportsStudioRender } from './deterministicRenderer';
import { EXPORT_PRESETS } from './exportPresets';

/**
 * Processes the studio render queue one job at a time. Mounted by the editor so
 * renders keep running while the coach continues editing; the R3F canvas is
 * driven frame-by-frame through `bridge.root.advance`.
 */
export function useRenderQueueProcessor(): void {
  const activeJobId = useRenderQueueStore((state) => state.activeJobId);
  const createRecording = trpc.recording.create.useMutation();

  useEffect(() => {
    useEditorStore.getState().setRenderJobActive(Boolean(activeJobId));
  }, [activeJobId]);

  // Leaving the editor cancels in-flight and queued renders (the canvas is gone).
  useEffect(
    () => () => {
      const queue = useRenderQueueStore.getState();
      if (queue.activeJobId) queue.cancelJob(queue.activeJobId);
      for (const job of queue.jobs) {
        if (job.status === 'queued') queue.cancelJob(job.id);
      }
      useEditorStore.getState().setRenderJobActive(false);
    },
    [],
  );

  useEffect(() => {
    if (activeJobId) return;
    const job = useRenderQueueStore.getState().jobs.find((item) => item.status === 'queued');
    if (!job) return;

    const preset = EXPORT_PRESETS[job.presetId];
    const controller = new AbortController();
    registerRenderAbort(job.id, controller);

    const queue = useRenderQueueStore.getState();
    queue.setActiveJob(job.id);
    queue.updateJob(job.id, { status: 'rendering', progress: 0 });

    const run = async () => {
      try {
        if (preset.format !== 'mp4') {
          throw new Error('Studio renders produce MP4. Use the realtime export for GIF or GLB.');
        }
        if (!supportsStudioRender()) {
          throw new Error(
            'WebCodecs video encoding is unavailable in this browser. Use the realtime export instead.',
          );
        }
        const durationMs = Math.min(usePlayStore.getState().durationMs, preset.maxSeconds * 1000);
        if (durationMs <= 0) throw new Error('Give the play some duration before rendering.');

        useEditorStore.getState().setRenderJobActive(true);
        const result = await renderDeterministic(preset, {
          durationMs,
          signal: controller.signal,
          onProgress: ({ phase, frame, totalFrames }) => {
            useRenderQueueStore.getState().updateJob(job.id, {
              status: phase === 'finalizing' ? 'finalizing' : 'rendering',
              frame,
              totalFrames,
              progress: totalFrames > 0 ? frame / totalFrames : 0,
            });
          },
        });

        useRenderQueueStore.getState().updateJob(job.id, { status: 'done', progress: 1, result });

        const play = usePlayStore.getState().play;
        if (play) {
          createRecording.mutate(
            {
              playId: play.id,
              format: 'mp4',
              preset: job.presetId,
              durationMs,
              fileSizeBytes: result.blob.size,
              fileUrl: null,
              thumbnailUrl: null,
            },
            { onError: (error) => console.error('Could not save render metadata', error) },
          );
        }
      } catch (error) {
        const aborted = controller.signal.aborted;
        if (!aborted) console.error('Studio render failed', error);
        useRenderQueueStore.getState().updateJob(
          job.id,
          aborted
            ? { status: 'cancelled' }
            : { status: 'error', error: error instanceof Error ? error.message : String(error) },
        );
      } finally {
        releaseRenderJob(job.id);
        useEditorStore.getState().setRenderJobActive(false);
        useRenderQueueStore.getState().setActiveJob(null);
      }
    };

    void run();
  }, [activeJobId, createRecording]);
}
