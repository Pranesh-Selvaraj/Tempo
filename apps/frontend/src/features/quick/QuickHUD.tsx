import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Loader2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  Video,
} from 'lucide-react';
import { NET_HEIGHT_MEN, ROLE_LABELS, TRAJECTORY_COLORS } from '@tempo/shared-types';
import { Modal, Button, Select } from '../../components/ui';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { usePlayStore } from '../../stores/playStore';
import { useQuickStore } from '../../stores/quickStore';
import { useTimelineStore } from '../../stores/timelineStore';
import {
  QUICK_STEPS,
  QUICK_STEP_LABELS,
  QUICK_TIMING,
  buildLegs,
  type QuickStep,
} from './quickPlay';

const TARGET_LABELS = ['Serve lands', 'Pass goes', 'Set goes'];

function StepChips() {
  const step = useQuickStore((state) => state.step);
  const setStep = useQuickStore((state) => state.setStep);
  const hasBallPath = useQuickStore((state) => state.ballTargets.length >= 3);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {QUICK_STEPS.map((value: QuickStep) => {
        const watchDisabled = value === 'play' && !hasBallPath;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setStep(value)}
            disabled={watchDisabled}
            title={watchDisabled ? 'Place the serve, pass and set targets first' : undefined}
            className={cn(
              'chip',
              watchDisabled && 'cursor-not-allowed opacity-40',
              step === value && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
            )}
          >
            {QUICK_STEP_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}

function HistoryButtons() {
  const canUndo = useQuickStore((state) => state.past.length > 0);
  const canRedo = useQuickStore((state) => state.future.length > 0);
  const undo = useQuickStore((state) => state.undo);
  const redo = useQuickStore((state) => state.redo);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RoleAssignments() {
  const players = usePlayStore((state) => state.players);
  const roles = useQuickStore((state) => state.roles);
  const setRole = useQuickStore((state) => state.setRole);
  const home = players.filter((player) => !player.playerId.startsWith('opp'));
  const kinds = [
    { key: 'receiver', label: 'Receiver' },
    { key: 'setter', label: 'Setter' },
    { key: 'spiker', label: 'Spiker' },
  ] as const;

  const choose = (kind: (typeof kinds)[number]['key'], playerId: string | null) => {
    if (playerId) {
      // A player can only hold one role; clear them from any other pick.
      for (const other of kinds) {
        if (other.key !== kind && roles[other.key] === playerId) setRole(other.key, null);
      }
    }
    setRole(kind, playerId);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">Who plays</span>
      {kinds.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1 text-[10px] text-slate-400">
          {label}
          <Select
            value={roles[key] ?? ''}
            onChange={(event) => choose(key, event.target.value || null)}
            className="h-7 w-28 py-0 text-[11px]"
          >
            <option value="">Auto</option>
            {home.map((player) => (
              <option
                key={player.playerId}
                value={player.playerId}
                disabled={kinds.some(
                  (other) => other.key !== key && roles[other.key] === player.playerId,
                )}
              >
                #{player.playerId.replace(/\D/g, '')} · {ROLE_LABELS[player.role]}
              </option>
            ))}
          </Select>
        </label>
      ))}
    </div>
  );
}

function ReceiveStep() {
  const lockReceive = useQuickStore((state) => state.lockReceive);
  const saveCustomFormation = useQuickStore((state) => state.saveCustomFormation);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-300">
        Drag your players to where they stand when receiving. Use the roster on the left to see who
        is who. Save the positions as your own formation, or lock them in.
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={saveCustomFormation} title="Save the current positions as a custom formation">
          Save custom
        </Button>
        <Button variant="primary" onClick={lockReceive}>
          Lock receive →
        </Button>
      </div>
    </div>
  );
}

function BallStep() {
  const ballTargets = useQuickStore((state) => state.ballTargets);
  const selectedTarget = useQuickStore((state) => state.selectedTarget);
  const selectTarget = useQuickStore((state) => state.selectTarget);
  const undo = useQuickStore((state) => state.undoBallTarget);
  const clearBall = useQuickStore((state) => state.clearBall);
  const setHeight = useQuickStore((state) => state.setHeight);
  const setSetHeight = useQuickStore((state) => state.setSetHeight);
  const beginHistory = useQuickStore((state) => state.beginHistory);

  const hint =
    selectedTarget !== null && selectedTarget < 3
      ? `Target ${selectedTarget + 1} selected — drag the marker, tap the court, or nudge with arrow keys`
      : (TARGET_LABELS[ballTargets.length] ?? 'All three targets placed');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-300">{hint}</p>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {TARGET_LABELS.map((label, index) =>
            ballTargets[index] ? (
              <button
                key={label}
                type="button"
                onClick={() => selectTarget(selectedTarget === index ? null : index)}
                className={cn(
                  'chip',
                  selectedTarget === index && 'border-sky-400/50 bg-sky-500/15 text-sky-100',
                )}
              >
                {index + 1} · {label}
              </button>
            ) : null,
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                'h-2 w-2 rounded-full',
                index < ballTargets.length ? 'bg-sky-400' : 'bg-slate-600',
              )}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-[10px] text-slate-400">
          Set height
          <input
            type="range"
            min={2}
            max={3.9}
            step={0.1}
            value={setHeight}
            onPointerDown={() => beginHistory('height')}
            onChange={(event) => setSetHeight(Number(event.target.value))}
            className="w-28 accent-sky-400"
          />
          <span className="tabular-nums text-slate-300">{setHeight.toFixed(1)} m</span>
        </label>
        <div className="ml-auto flex items-center gap-1">
          <Button onClick={undo} disabled={ballTargets.length === 0}>
            <Undo2 className="h-3.5 w-3.5" />
            Undo tap
          </Button>
          <Button onClick={clearBall} disabled={ballTargets.length === 0}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttackStep() {
  const blockers = useQuickStore((state) => state.blockers);
  const setBlockers = useQuickStore((state) => state.setBlockers);
  const spikeTarget = useQuickStore((state) => state.spikeTarget);
  const selectedTarget = useQuickStore((state) => state.selectedTarget);
  const selectTarget = useQuickStore((state) => state.selectTarget);
  const setStep = useQuickStore((state) => state.setStep);
  const ballTargets = useQuickStore((state) => state.ballTargets);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-300">
          Drag players to where they&apos;ll be at the spike — the dashed lines show each run. Drag
          the ball markers to fine-tune the path, then tap the opponent court to mark where the
          spike lands.
        </p>
        <button
          type="button"
          onClick={() => selectTarget(selectedTarget === 3 ? null : 3)}
          className={cn(
            'chip ml-auto',
            selectedTarget === 3 && 'border-red-400/50 bg-red-500/15 text-red-100',
          )}
        >
          4 · Spike lands
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Blocks</span>
          {[0, 1, 2, 3].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setBlockers(count)}
              className={cn(
                'chip w-7 justify-center',
                blockers === count && 'border-orange-400/50 bg-orange-500/15 text-orange-100',
              )}
            >
              {count}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          className="ml-auto"
          disabled={!spikeTarget || ballTargets.length < 3}
          onClick={() => setStep('play')}
        >
          <Play className="h-3.5 w-3.5" />
          Watch the play
        </Button>
      </div>
    </div>
  );
}

function PlayStep() {
  const navigate = useNavigate();
  const currentMs = useTimelineStore((state) => state.currentMs);
  const playing = useTimelineStore((state) => state.playing);
  const setCurrent = useTimelineStore((state) => state.setCurrent);
  const setPlaying = useTimelineStore((state) => state.setPlaying);
  const durationMs = usePlayStore((state) => state.durationMs);
  const keyframes = usePlayStore((state) => state.keyframes);
  const setStep = useQuickStore((state) => state.setStep);
  const ballTargets = useQuickStore((state) => state.ballTargets);
  const spikeTarget = useQuickStore((state) => state.spikeTarget);
  const setHeight = useQuickStore((state) => state.setHeight);
  const savedPlayId = useQuickStore((state) => state.savedPlayId);
  const saving = useQuickStore((state) => state.saving);
  const error = useQuickStore((state) => state.error);
  const [savedOpen, setSavedOpen] = useState(false);
  const utils = trpc.useContext();
  const createPlay = trpc.play.create.useMutation();
  const createTrajectory = trpc.trajectory.create.useMutation();
  const upsertKeyframe = trpc.keyframe.upsert.useMutation();
  const createAnnotation = trpc.annotation.create.useMutation();

  const legs = useMemo(
    () => buildLegs(ballTargets, spikeTarget, setHeight),
    [ballTargets, spikeTarget, setHeight],
  );

  const replay = () => {
    setCurrent(0);
    setPlaying(true);
  };

  const save = async () => {
    const quick = useQuickStore.getState();
    quick.markSaving();
    try {
      const play = await createPlay.mutateAsync({
        name: quick.name.trim() || `Quick play · R${quick.rotation}`,
        category: 'serve_receive',
        rotation: quick.rotation,
        formation: quick.formation === 'custom' ? '5-1' : quick.formation,
        libero: quick.libero,
        courtType: 'indoor',
        netHeight: NET_HEIGHT_MEN,
      });
      for (const leg of legs) {
        await createTrajectory.mutateAsync({
          playId: play.id,
          type: leg.type,
          controlPoints: leg.controlPoints,
          startMs: leg.startMs,
          durationMs: leg.durationMs,
        });
      }
      for (const keyframe of usePlayStore.getState().keyframes) {
        await upsertKeyframe.mutateAsync({
          playId: play.id,
          timestampMs: keyframe.timestampMs,
          playerStates: keyframe.playerStates,
          ballState: null,
          cameraState: null,
        });
      }
      if (quick.spikeTarget) {
        await createAnnotation.mutateAsync({
          playId: play.id,
          text: 'Spike lands',
          position: quick.spikeTarget,
          visibleFromMs: QUICK_TIMING.spikeAtMs,
          color: '#f87171',
        });
      }
      await utils.play.list.invalidate();
      useQuickStore.getState().markSaved(play.id);
      setSavedOpen(true);
    } catch (saveError) {
      useQuickStore
        .getState()
        .markError(saveError instanceof Error ? saveError.message : 'Could not save the play');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Jump to</span>
        {legs.map((leg) => (
          <button
            key={leg.type}
            type="button"
            onClick={() => {
              setPlaying(false);
              setCurrent(leg.startMs);
            }}
            className="chip"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TRAJECTORY_COLORS[leg.type] }}
            />
            {leg.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button onClick={replay}>
          <RotateCcw className="h-3.5 w-3.5" />
          Replay
        </Button>
        <input
          type="range"
          min={0}
          max={durationMs}
          value={Math.min(currentMs, durationMs)}
          onChange={(event) => {
            setPlaying(false);
            setCurrent(Number(event.target.value));
          }}
          className="min-w-[160px] flex-1 accent-sky-400"
        />
        <Button onClick={() => setStep('attack')}>Edit setup</Button>
        <Button variant="primary" onClick={save} disabled={saving || keyframes.length === 0}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {savedPlayId ? 'Save a copy' : 'Save play'}
        </Button>
        {savedPlayId && (
          <>
            <Button onClick={() => navigate(`/play/${savedPlayId}`)}>Open editor</Button>
            <Button onClick={() => navigate(`/play/${savedPlayId}?record=1`)}>
              <Video className="h-3.5 w-3.5" />
              Record video
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-[11px] text-red-300">{error}</p>}

      <Modal open={savedOpen} onClose={() => setSavedOpen(false)} title="Play saved" size="sm">
        <p className="text-xs text-slate-300">
          Your interactive play is now a normal Tempo play — keyframes, ball paths and the spike
          marker are all there. Keep editing the advanced detail or record it as a video.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setSavedOpen(false)}>Keep watching</Button>
          <Button onClick={() => savedPlayId && navigate(`/play/${savedPlayId}`)}>
            Open editor
          </Button>
          <Button
            variant="primary"
            onClick={() => savedPlayId && navigate(`/play/${savedPlayId}?record=1`)}
          >
            <Video className="h-3.5 w-3.5" />
            Record video
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const HUD_COLLAPSED_KEY = 'tempo.quick.hud.collapsed';

const SHORTCUTS: [string, string][] = [
  ['1 – 3', 'Select the serve, pass or set marker'],
  ['4', 'Select the spike marker'],
  ['Arrows', 'Nudge the selected marker (Shift for bigger steps)'],
  ['Ctrl/Cmd + Z', 'Undo the last change'],
  ['Ctrl/Cmd + Shift + Z', 'Redo'],
];

function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Interactive play shortcuts" size="sm">
        <ul className="space-y-2">
          {SHORTCUTS.map(([keys, what]) => (
            <li key={keys} className="flex items-center justify-between gap-3 text-xs">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                {keys}
              </kbd>
              <span className="flex-1 text-right text-slate-400">{what}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

export function QuickHUD() {
  const step = useQuickStore((state) => state.step);
  const selectedTarget = useQuickStore((state) => state.selectedTarget);
  const ballTargetCount = useQuickStore((state) => state.ballTargets.length);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(HUD_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      try {
        sessionStorage.setItem(HUD_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const content = useMemo(() => {
    if (step === 'receive') return <ReceiveStep />;
    if (step === 'ball') return <BallStep />;
    if (step === 'attack') return <AttackStep />;
    return <PlayStep />;
  }, [step]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
      <p className="sr-only" aria-live="polite">
        {QUICK_STEP_LABELS[step]}
        {selectedTarget !== null ? `, target ${selectedTarget + 1} selected` : ''}
        {step === 'ball' ? `, ${ballTargetCount} of 3 ball targets placed` : ''}
      </p>
      <div className="panel pointer-events-auto w-full max-w-3xl space-y-3 p-3">
        <div className="flex items-center gap-1">
          <StepChips />
          <div className="ml-auto flex items-center gap-1">
            <HistoryButtons />
            <ShortcutHelp />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand coach controls' : 'Collapse coach controls'}
              aria-label={collapsed ? 'Expand coach controls' : 'Collapse coach controls'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {!collapsed && content}
        {!collapsed && (step === 'ball' || step === 'attack') && <RoleAssignments />}
      </div>
    </div>
  );
}
