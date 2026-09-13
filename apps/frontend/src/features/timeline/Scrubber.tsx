import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { clamp, formatMs } from '@tempo/shared-types';
import { useTimelineStore } from '../../stores/timelineStore';

export function Ruler({ durationMs }: { durationMs: number }) {
  const ticks = [];
  const step = durationMs > 20000 ? 2000 : durationMs > 8000 ? 1000 : 500;
  for (let ms = 0; ms <= durationMs + 1; ms += step) {
    const percent = (ms / durationMs) * 100;
    const major = ms % (step * 2) === 0;
    ticks.push(
      <div
        key={ms}
        className="absolute top-0 flex h-full flex-col items-start"
        style={{ left: `${percent}%` }}
      >
        <div className={major ? 'h-3 w-px bg-white/30' : 'h-1.5 w-px bg-white/15'} />
        {major && (
          <span className="mt-0.5 -translate-x-1/2 text-[9px] tabular-nums text-slate-500">
            {formatMs(ms)}
          </span>
        )}
      </div>,
    );
  }
  return <div className="relative h-full w-full">{ticks}</div>;
}

export function Playhead({ durationMs }: { durationMs: number }) {
  const currentMs = useTimelineStore((state) => state.currentMs);
  const percent = clamp((currentMs / Math.max(1, durationMs)) * 100, 0, 100);
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-30 w-px bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
      style={{ left: `${percent}%` }}
    >
      <div className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-sky-400" />
    </div>
  );
}

/**
 * Pointer-scrubbing surface for the timeline. Lane content is rendered as
 * children; interactive chips should stopPropagation on pointerdown.
 */
export function Scrubber({ durationMs, children }: { durationMs: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setCurrent = useTimelineStore((state) => state.setCurrent);
  const setPlaying = useTimelineStore((state) => state.setPlaying);
  const setScrubbing = useTimelineStore((state) => state.setScrubbing);

  const msFromClientX = (clientX: number): number => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    return ratio * durationMs;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPlaying(false);
    setDragging(true);
    setScrubbing(true);
    setCurrent(msFromClientX(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setCurrent(msFromClientX(event.clientX));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    setScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={ref}
      className="relative h-full w-full cursor-crosshair touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flex h-full flex-col">
        <div className="h-5 shrink-0">
          <Ruler durationMs={durationMs} />
        </div>
        {children}
      </div>
      <Playhead durationMs={durationMs} />
    </div>
  );
}
