import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Repeat,
  SkipBack,
  Video,
} from 'lucide-react';
import {
  clamp,
  formatMs,
  TRAJECTORY_COLORS,
  type Trajectory,
} from '@tempo/shared-types';
import { ballPositionAt } from '../../lib/ballPosition';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { FRAME_MS, SPEEDS, useTimelineStore } from '../../stores/timelineStore';
import { Button, IconButton, Select } from '../../components/ui';
import { PhaseLane } from './PhaseMarkers';
import { Scrubber } from './Scrubber';

function percentLeft(ms: number, durationMs: number): string {
  return `${clamp((ms / Math.max(1, durationMs)) * 100, 0, 100)}%`;
}

function TrajectoryLane({
  trajectories,
  durationMs,
}: {
  trajectories: Trajectory[];
  durationMs: number;
}) {
  const selectedTrajectoryId = useEditorStore((store) => store.selectedTrajectoryId);

  return (
    <div className="relative h-6 w-full">
      {trajectories.map((trajectory) => {
        const color = trajectory.color ?? TRAJECTORY_COLORS[trajectory.type];
        const selected = trajectory.id === selectedTrajectoryId;
        return (
          <button
            key={trajectory.id}
            type="button"
            title={`${trajectory.type} · ${formatMs(trajectory.startMs)} → ${formatMs(trajectory.startMs + trajectory.durationMs)}`}
            onPointerDown={(event: ReactPointerEvent) => {
              event.stopPropagation();
              useEditorStore.getState().selectTrajectory(trajectory.id);
              useTimelineStore.getState().setPlaying(false);
              useTimelineStore.getState().setCurrent(trajectory.startMs);
            }}
            className="absolute top-1 h-4 overflow-hidden rounded-sm border text-left text-[9px] font-semibold uppercase tracking-wide transition"
            style={{
              left: percentLeft(trajectory.startMs, durationMs),
              width: `${Math.max(1, (trajectory.durationMs / Math.max(1, durationMs)) * 100)}%`,
              borderColor: color,
              backgroundColor: `${color}2e`,
              color,
              opacity: trajectory.visible ? (selected ? 1 : 0.85) : 0.3,
            }}
          >
            <span className="truncate px-1 leading-4">{trajectory.type}</span>
          </button>
        );
      })}
    </div>
  );
}

function KeyframeLane({ durationMs }: { durationMs: number }) {
  const keyframes = usePlayStore((state) => state.keyframes);
  const selectedKeyframeId = useEditorStore((store) => store.selectedKeyframeId);
  const draggingRef = useRef<string | null>(null);
  const retime = trpc.keyframe.retime.useMutation();

  const msFromElement = (element: HTMLElement, clientX: number): number => {
    const rect = element.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    return Math.round(ratio * durationMs);
  };

  return (
    <div className="relative h-6 w-full">
      {keyframes.map((keyframe) => {
        const selected = keyframe.id === selectedKeyframeId;
        return (
          <button
            key={keyframe.id}
            type="button"
            title={`Keyframe ${formatMs(keyframe.timestampMs)}`}
            onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              draggingRef.current = keyframe.id;
              useEditorStore.getState().selectKeyframe(keyframe.id);
              useTimelineStore.getState().setPlaying(false);
              useTimelineStore.getState().setCurrent(keyframe.timestampMs);
            }}
            onPointerMove={(event: ReactPointerEvent<HTMLButtonElement>) => {
              if (draggingRef.current !== keyframe.id) return;
              const lane = event.currentTarget.parentElement;
              if (!lane) return;
              const nextMs = msFromElement(lane, event.clientX);
              usePlayStore.getState().setKeyframes(
                usePlayStore
                  .getState()
                  .keyframes.map((item) =>
                    item.id === keyframe.id ? { ...item, timestampMs: nextMs } : item,
                  )
                  .sort((a, b) => a.timestampMs - b.timestampMs),
              );
            }}
            onPointerUp={(event: ReactPointerEvent<HTMLButtonElement>) => {
              if (draggingRef.current !== keyframe.id) return;
              draggingRef.current = null;
              const current = usePlayStore
                .getState()
                .keyframes.find((item) => item.id === keyframe.id);
              if (!current) return;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              retime.mutate(
                { id: current.id, timestampMs: current.timestampMs },
                {
                  onError: (error) => console.error('Could not retime keyframe', error),
                },
              );
            }}
            className="absolute top-1.5 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[2px] border transition"
            style={{
              left: percentLeft(keyframe.timestampMs, durationMs),
              backgroundColor: selected ? '#38bdf8' : '#0ea5e9aa',
              borderColor: '#e0f2fe',
            }}
          >
            <span className="sr-only">Keyframe at {formatMs(keyframe.timestampMs)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Timeline() {
  const durationMs = usePlayStore((state) => state.durationMs);
  const setDuration = usePlayStore((state) => state.setDuration);
  const phases = usePlayStore((state) => state.phases);
  const trajectories = usePlayStore((state) => state.trajectories);
  const keyframes = usePlayStore((state) => state.keyframes);
  const currentMs = useTimelineStore((state) => state.currentMs);
  const playing = useTimelineStore((state) => state.playing);
  const speed = useTimelineStore((state) => state.speed);
  const loop = useTimelineStore((state) => state.loop);
  const recording = useEditorStore((store) => store.recordingFrame.active);

  const upsertKeyframe = trpc.keyframe.upsert.useMutation();

  const recordKeyframe = () => {
    const { play, players, trajectories: trajs, keyframes: kfs } = usePlayStore.getState();
    if (!play || recording) return;
    const timestampMs = Math.round(useTimelineStore.getState().currentMs);
    const ball = ballPositionAt(trajs, kfs, timestampMs);
    upsertKeyframe.mutate(
      {
        playId: play.id,
        timestampMs,
        playerStates: players,
        ballState: ball,
        cameraState: null,
      },
      {
        onSuccess: (keyframe) => {
          usePlayStore.getState().upsertKeyframe(keyframe);
          useEditorStore.getState().selectKeyframe(keyframe.id);
        },
        onError: (error) => console.error('Could not save keyframe', error),
      },
    );
  };

  const setCurrent = useTimelineStore((state) => state.setCurrent);
  const toggle = useTimelineStore((state) => state.toggle);
  const setSpeed = useTimelineStore((state) => state.setSpeed);
  const setLoop = useTimelineStore((state) => state.setLoop);
  const stepFrames = useTimelineStore((state) => state.stepFrames);

  return (
    <div className="flex h-full flex-col gap-1.5 border-t border-white/5 bg-panel-900/80 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <IconButton title="Go to start" onClick={() => setCurrent(0)}>
          <SkipBack className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton title="Previous frame" onClick={() => stepFrames(-1, durationMs)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <IconButton
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={toggle}
          className="bg-sky-500/25 text-sky-100"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <IconButton title="Next frame" onClick={() => stepFrames(1, durationMs)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
        <IconButton
          title="Loop playback"
          onClick={() => setLoop(!loop)}
          className={loop ? 'bg-sky-500/20 text-sky-200' : undefined}
        >
          <Repeat className="h-3.5 w-3.5" />
        </IconButton>

        <Select
          value={String(speed)}
          onChange={(event) => setSpeed(Number(event.target.value) as (typeof SPEEDS)[number])}
          className="w-20 py-1"
          title="Playback speed"
        >
          {SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </Select>

        <span className="ml-2 font-mono text-xs tabular-nums text-slate-300">
          {formatMs(currentMs)} <span className="text-slate-600">/</span>{' '}
          {formatMs(durationMs)}
        </span>

        <label className="ml-2 flex items-center gap-1 text-[10px] text-slate-500">
          duration
          <input
            type="number"
            min={1}
            step={0.5}
            value={Math.round(durationMs / 100) / 10}
            onChange={(event) => setDuration(Number(event.target.value) * 1000)}
            className="w-16 rounded border border-white/10 bg-panel-950/80 px-1 py-0.5 text-right text-[11px] tabular-nums text-slate-200 outline-none focus:border-sky-400/60"
          />
          s
        </label>

        <Button
          variant="primary"
          className="ml-auto"
          onClick={recordKeyframe}
          disabled={upsertKeyframe.isLoading || recording}
          title="Capture all players + ball at the playhead (K)"
        >
          <Video className="h-3.5 w-3.5" />
          Record keyframe
          <span className="chip ml-1">{keyframes.length}</span>
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[58px_1fr] gap-x-2">
        <div className="flex flex-col text-[10px] uppercase tracking-wide text-slate-500">
          <div className="h-5" />
          <div className="flex h-6 items-center">Phases</div>
          <div className="flex h-6 items-center">Ball</div>
          <div className="flex h-6 items-center">Keys</div>
        </div>
        <Scrubber durationMs={durationMs}>
          <div className="timeline-track h-6 shrink-0">
            <PhaseLane phases={phases} durationMs={durationMs} />
          </div>
          <div className="timeline-track h-6 shrink-0">
            <TrajectoryLane trajectories={trajectories} durationMs={durationMs} />
          </div>
          <div className="timeline-track h-6 shrink-0">
            <KeyframeLane durationMs={durationMs} />
          </div>
        </Scrubber>
      </div>
      <p className="text-[10px] text-slate-500">
        Space play/pause · ←/→ step {Math.round(FRAME_MS)} ms · K record keyframe · drag keyframes to retime
      </p>
    </div>
  );
}
