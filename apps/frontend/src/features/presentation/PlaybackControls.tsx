import type { MouseEvent as ReactMouseEvent } from 'react';
import { Maximize, Pause, Play, SkipBack } from 'lucide-react';
import { clamp, formatMs } from '@tempo/shared-types';
import { usePlayStore } from '../../stores/playStore';
import { SPEEDS, useTimelineStore } from '../../stores/timelineStore';

export function PlaybackControls({ showFullscreen = false }: { showFullscreen?: boolean }) {
  const durationMs = usePlayStore((state) => state.durationMs);
  const currentMs = useTimelineStore((state) => state.currentMs);
  const playing = useTimelineStore((state) => state.playing);
  const speed = useTimelineStore((state) => state.speed);
  const progress = clamp(currentMs / Math.max(1, durationMs), 0, 1);

  const seek = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    useTimelineStore.getState().setPlaying(false);
    useTimelineStore.getState().setCurrent(ratio * durationMs);
  };

  const requestFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch((error) => console.error(error));
  };

  return (
    <div className="space-y-2">
      <div
        className="group relative h-6 cursor-pointer touch-none"
        onClick={seek}
        role="presentation"
      >
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-sky-400"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-panel-950 opacity-0 transition group-hover:opacity-100"
            style={{ left: `calc(${progress * 100}% - 7px)` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-icon"
          title="Back to start"
          onClick={() => {
            useTimelineStore.getState().setPlaying(false);
            useTimelineStore.getState().setCurrent(0);
          }}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="btn btn-primary btn-icon h-9 w-9"
          title={playing ? 'Pause' : 'Play'}
          onClick={() => useTimelineStore.getState().toggle()}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <span className="font-mono text-xs tabular-nums text-slate-400">
          {formatMs(currentMs)} / {formatMs(durationMs)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => useTimelineStore.getState().setSpeed(value)}
              className={
                speed === value
                  ? 'rounded-md bg-sky-500/25 px-2 py-1 text-xs font-semibold text-sky-100'
                  : 'rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5'
              }
            >
              {value}×
            </button>
          ))}
          {showFullscreen && (
            <button type="button" className="btn btn-icon ml-1" title="Full screen" onClick={requestFullscreen}>
              <Maximize className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
