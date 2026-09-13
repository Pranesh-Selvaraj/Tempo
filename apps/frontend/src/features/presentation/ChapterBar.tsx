import { ChevronLeft, ChevronRight } from 'lucide-react';
import { phaseColor, type Phase } from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { useTimelineStore } from '../../stores/timelineStore';

export function ChapterBar({ phases, compact = false }: { phases: Phase[]; compact?: boolean }) {
  const currentMs = useTimelineStore((state) => state.currentMs);
  const setCurrent = useTimelineStore((state) => state.setCurrent);
  const setPlaying = useTimelineStore((state) => state.setPlaying);

  if (phases.length === 0) return null;

  const activeIndex = phases.findIndex(
    (phase) => currentMs >= phase.startMs && currentMs < phase.endMs,
  );
  const active = activeIndex >= 0 ? phases[activeIndex] : null;

  const jump = (index: number) => {
    const phase = phases[Math.max(0, Math.min(phases.length - 1, index))];
    if (!phase) return;
    setPlaying(false);
    setCurrent(phase.startMs);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-icon shrink-0"
        title="Previous chapter"
        onClick={() => jump(activeIndex <= 0 ? 0 : activeIndex - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {phases.map((phase, index) => {
          const isActive = active?.id === phase.id;
          const color = phaseColor(phase.name);
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => jump(index)}
              className={cn(
                'shrink-0 rounded-lg border px-3 py-1.5 text-left transition',
                isActive ? 'text-slate-950' : 'text-slate-300 hover:border-white/25',
              )}
              style={{
                borderColor: color,
                backgroundColor: isActive ? color : `${color}1f`,
              }}
            >
              <span className={cn('block text-xs font-semibold', compact && 'text-[11px]')}>
                {phase.name}
              </span>
              {!compact && phase.coachingNote && (
                <span
                  className={cn(
                    'mt-0.5 block max-w-[220px] truncate text-[10px]',
                    isActive ? 'text-slate-800' : 'text-slate-400',
                  )}
                >
                  {phase.coachingNote}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-icon shrink-0"
        title="Next chapter"
        onClick={() => jump(activeIndex + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
