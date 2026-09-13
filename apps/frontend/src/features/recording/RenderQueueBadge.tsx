import { Loader2 } from 'lucide-react';
import { useRenderQueueStore } from '../../stores/renderQueueStore';

/** Floating indicator while a studio (frame-perfect) render is running. */
export function RenderQueueBadge() {
  const job = useRenderQueueStore(
    (state) => state.jobs.find((item) => item.id === state.activeJobId) ?? null,
  );

  if (!job) return null;
  const percent = Math.max(0, Math.min(100, Math.round(job.progress * 100)));

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-violet-400/30 bg-panel-900/95 px-4 py-2 text-xs text-violet-100 shadow-xl">
      <span className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Studio render
        {job.totalFrames > 0 && ` · frame ${job.frame}/${job.totalFrames}`}
        {job.status === 'finalizing' ? ' · muxing MP4…' : ` · ${percent}%`}
      </span>
      <span className="mt-1.5 block h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full bg-violet-400 transition-all"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </span>
    </div>
  );
}
