import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Film,
  Layers,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { RecordingPresetId } from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import { useRenderQueueStore, type RenderJob } from '../../stores/renderQueueStore';
import { Button, Modal, Segmented } from '../../components/ui';
import { supportsStudioRender } from './deterministicRenderer';
import { EXPORT_PRESET_LIST, EXPORT_PRESETS, type ExportPreset } from './exportPresets';
import { ShareDialog, SharePanel } from './ShareDialog';
import { useRecorder, type RecordingResult } from './useRecorder';

type ExportMode = 'realtime' | 'studio';

function PresetPicker({
  value,
  onChange,
  studioOnly = false,
}: {
  value: RecordingPresetId;
  onChange: (id: RecordingPresetId) => void;
  studioOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {EXPORT_PRESET_LIST.map((option) => {
        const unsupported = studioOnly && option.format !== 'mp4';
        return (
          <button
            key={option.id}
            type="button"
            disabled={unsupported}
            title={unsupported ? 'Studio renders produce MP4 only' : undefined}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-lg border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-35',
              option.id === value
                ? 'border-sky-400/60 bg-sky-500/10'
                : 'border-white/10 bg-panel-950/50 hover:border-white/25',
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
              {option.format === 'mp4' ? <Film className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {option.label}
            </span>
            <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const STATUS_STYLES: Record<RenderJob['status'], string> = {
  queued: 'border-white/10 text-slate-300',
  rendering: 'border-violet-400/40 text-violet-100',
  finalizing: 'border-violet-400/40 text-violet-100',
  done: 'border-emerald-400/40 text-emerald-100',
  error: 'border-red-400/40 text-red-100',
  cancelled: 'border-white/10 text-slate-400',
};

function JobRow({
  job,
  onShare,
}: {
  job: RenderJob;
  onShare: (result: RecordingResult) => void;
}) {
  const cancelJob = useRenderQueueStore((state) => state.cancelJob);
  const removeJob = useRenderQueueStore((state) => state.removeJob);
  const busy = job.status === 'rendering' || job.status === 'finalizing' || job.status === 'queued';
  const percent = Math.round(job.progress * 100);

  return (
    <div className={cn('rounded-lg border bg-panel-950/50 p-2.5', STATUS_STYLES[job.status])}>
      <div className="flex items-center gap-2">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {job.status === 'done' && <Check className="h-3.5 w-3.5 text-emerald-300" />}
        {job.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-300" />}
        {job.status === 'cancelled' && <XCircle className="h-3.5 w-3.5 text-slate-500" />}
        <span className="text-xs font-semibold text-slate-100">
          {EXPORT_PRESETS[job.presetId].label}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">{job.status}</span>
      </div>

      {busy && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.max(2, percent)}%` }} />
          </div>
          <p className="mt-1 text-[10px] tabular-nums text-slate-500">
            {job.totalFrames > 0 ? `${job.frame}/${job.totalFrames} frames · ` : ''}
            {percent}%
          </p>
        </div>
      )}

      {job.error && <p className="mt-2 text-[11px] text-red-200">{job.error}</p>}

      {job.result && (
        <p className="mt-1 text-[10px] text-slate-500">
          {formatBytes(job.result.blob.size)} · MP4 · frame-perfect
        </p>
      )}

      <div className="mt-2 flex gap-1.5">
        {job.status === 'done' && job.result && (
          <Button variant="primary" className="flex-1" onClick={() => onShare(job.result!)}>
            <Share2 className="h-3 w-3" />
            Share
          </Button>
        )}
        {busy && (
          <Button className="flex-1" onClick={() => cancelJob(job.id)}>
            Cancel
          </Button>
        )}
        {!busy && (
          <Button variant="ghost" className="ml-auto" title="Remove from queue" onClick={() => removeJob(job.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StudioPanel({ preset, presetId, onPreset }: { preset: ExportPreset; presetId: RecordingPresetId; onPreset: (id: RecordingPresetId) => void }) {
  const jobs = useRenderQueueStore((state) => state.jobs);
  const enqueue = useRenderQueueStore((state) => state.enqueue);
  const clearFinished = useRenderQueueStore((state) => state.clearFinished);
  const supported = supportsStudioRender();
  const [sharedResult, setSharedResult] = useState<RecordingResult | null>(null);

  return (
    <div className="space-y-4">
      <PresetPicker value={presetId} onChange={onPreset} studioOnly />

      <div className="rounded-lg border border-violet-400/20 bg-violet-500/5 p-3 text-[11px] leading-relaxed text-slate-400">
        <p className="flex items-center gap-1.5 font-medium text-violet-100">
          <Layers className="h-3.5 w-3.5" /> Studio render (frame-perfect)
        </p>
        <p className="mt-1">
          Tempo renders every frame at an exact timestamp and encodes it with WebCodecs (H.264) into
          an MP4 — no realtime capture, so slow pans stay smooth and the result is reproducible. The
          queue keeps running while you keep editing.
        </p>
      </div>

      {!supported && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This browser does not expose WebCodecs video encoding. Use the realtime export tab instead
          (Chrome and Edge support studio renders).
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={!supported || preset.format !== 'mp4'}
          onClick={() => enqueue(presetId)}
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Add {preset.label} to render queue
        </Button>
        {jobs.some((job) => !['queued', 'rendering', 'finalizing'].includes(job.status)) && (
          <Button onClick={clearFinished}>Clear finished</Button>
        )}
      </div>

      {jobs.length > 0 && (
        <div className="space-y-2">
          <p className="field-label">Queue</p>
          <div className="scroll-thin max-h-64 space-y-2 overflow-y-auto pr-1">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onShare={setSharedResult} />
            ))}
          </div>
        </div>
      )}

      <ShareDialog
        open={sharedResult !== null}
        onClose={() => setSharedResult(null)}
        result={sharedResult}
      />
    </div>
  );
}

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<ExportMode>('realtime');
  const [presetId, setPresetId] = useState<RecordingPresetId>('whatsapp');
  const recorder = useRecorder();
  const preset = EXPORT_PRESETS[presetId];
  const busy = recorder.status === 'recording' || recorder.status === 'encoding';
  const showModal = open && !busy && (recorder.status !== 'done' || recorder.result !== null);

  useEffect(() => {
    if (!open) recorder.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (busy) return;
    recorder.reset();
    onClose();
  };

  return (
    <>
      <Modal
        open={showModal}
        onClose={close}
        title={recorder.status === 'done' && recorder.result ? 'Export ready' : 'Export'}
        size="md"
      >
        {recorder.status === 'done' && recorder.result ? (
          <SharePanel result={recorder.result} />
        ) : (
          <div className="space-y-4">
            <Segmented<ExportMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'realtime', label: 'Realtime capture' },
                { value: 'studio', label: 'Studio render' },
              ]}
            />

            {mode === 'realtime' ? (
              <>
                <PresetPicker value={presetId} onChange={setPresetId} />
                <div className="rounded-lg border border-white/5 bg-panel-950/50 p-3 text-[11px] leading-relaxed text-slate-400">
                  <p className="font-medium text-slate-200">How realtime capture works</p>
                  <p className="mt-1">
                    Tempo plays the timeline once and captures the 3D canvas with MediaRecorder, then
                    converts to {preset.format.toUpperCase()} in your browser with ffmpeg.wasm. Keep
                    this tab visible while recording.
                  </p>
                </div>
                {recorder.error && (
                  <p className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 text-xs text-red-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {recorder.error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button onClick={close} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => recorder.record(preset)}
                    disabled={busy || recorder.status === 'recording'}
                  >
                    <Film className="h-3.5 w-3.5" />
                    Export {preset.label}
                  </Button>
                </div>
              </>
            ) : (
              <StudioPanel preset={preset} presetId={presetId} onPreset={setPresetId} />
            )}
          </div>
        )}
      </Modal>

      {busy && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-sky-400/30 bg-panel-900/95 px-3.5 py-2 text-xs text-sky-100 shadow-xl">
          {recorder.status === 'recording' ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording in real time — keep this tab visible
            </>
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {recorder.progress >= 1 ? (
                <>
                  Finishing up <Check className="inline h-3.5 w-3.5" />
                </>
              ) : (
                `Encoding ${Math.round(recorder.progress * 100)}%`
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
