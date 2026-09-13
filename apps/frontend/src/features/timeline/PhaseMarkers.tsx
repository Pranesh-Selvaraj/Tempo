import type { PointerEvent as ReactPointerEvent } from 'react';
import { phaseColor, type Phase } from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';
import { useTimelineStore } from '../../stores/timelineStore';

export function PhaseLane({ phases, durationMs }: { phases: Phase[]; durationMs: number }) {
  const selectedPhaseId = useEditorStore((store) => store.selectedPhaseId);

  return (
    <div className="relative h-6 w-full">
      {phases.map((phase) => {
        const left = (phase.startMs / durationMs) * 100;
        const width = Math.max(0.6, ((phase.endMs - phase.startMs) / durationMs) * 100);
        const color = phaseColor(phase.name);
        const selected = phase.id === selectedPhaseId;
        return (
          <button
            key={phase.id}
            type="button"
            title={phase.coachingNote ?? phase.name}
            onPointerDown={(event: ReactPointerEvent) => {
              event.stopPropagation();
              useEditorStore.getState().selectPhase(phase.id);
              useTimelineStore.getState().setPlaying(false);
              useTimelineStore.getState().setCurrent(phase.startMs);
            }}
            className="absolute top-1 h-4 overflow-hidden rounded-sm border text-left text-[9px] font-semibold transition"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              borderColor: color,
              backgroundColor: `${color}33`,
              color,
              opacity: selected ? 1 : 0.85,
            }}
          >
            <span className="truncate px-1 leading-4">{phase.name}</span>
          </button>
        );
      })}
    </div>
  );
}
