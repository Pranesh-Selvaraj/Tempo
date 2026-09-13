import { useMemo, useState } from 'react';
import {
  Camera as CameraIcon,
  Clapperboard,
  Eye,
  EyeOff,
  Flag,
  ListTree,
  MapPin,
  MessageSquare,
  MousePointer2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import {
  ANNOTATION_COLORS,
  CAMERA_PRESETS_MAP,
  POSE_LABELS,
  POSES,
  ROLE_LABELS,
  TRAJECTORY_COLORS,
  TRAJECTORY_LABELS,
  TRAJECTORY_TYPES,
  phaseColor,
  type CameraPresetId,
  type PlayerState,
  type Trajectory,
  type TrajectoryType,
} from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { bridge } from '../../lib/bridge';
import { trpc } from '../../lib/trpc';
import { useCameraStore } from '../../stores/cameraStore';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Button, Field, NumberInput, Panel, Segmented, Select, TextArea, TextInput, Toggle } from '../../components/ui';
import type { Annotation, CameraPath, Keyframe, Phase } from '../../lib/trpc';

type Tab = 'inspector' | 'phases' | 'notes' | 'camera';

function TrajectoryInspector({ trajectory }: { trajectory: Trajectory }) {
  const update = trpc.trajectory.update.useMutation();
  const remove = trpc.trajectory.delete.useMutation();
  const selectedPointIndex = useEditorStore((store) => store.selectedPointIndex);
  const selectPoint = useEditorStore((store) => store.selectPoint);

  const commit = (patch: Partial<Trajectory>) => {
    usePlayStore.getState().updateTrajectory(trajectory.id, patch);
    update.mutate(
      { id: trajectory.id, ...patch },
      { onError: (error) => console.error('Could not update trajectory', error) },
    );
  };

  const removeTrajectory = () => {
    remove.mutate(
      { id: trajectory.id },
      {
        onSuccess: () => {
          usePlayStore.getState().removeTrajectory(trajectory.id);
          useEditorStore.getState().selectTrajectory(null);
        },
        onError: (error) => console.error('Could not delete trajectory', error),
      },
    );
  };

  const point = selectedPointIndex !== null ? trajectory.controlPoints[selectedPointIndex] : null;

  return (
    <Panel title={`Ball path · ${TRAJECTORY_LABELS[trajectory.type]}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {TRAJECTORY_TYPES.map((type: TrajectoryType) => (
            <button
              key={type}
              type="button"
              onClick={() => commit({ type, color: TRAJECTORY_COLORS[type] })}
              className={cn(
                'rounded-md border px-1 py-1 text-[10px] font-semibold',
                trajectory.type === type ? 'text-slate-950' : 'text-slate-300',
              )}
              style={{
                borderColor: TRAJECTORY_COLORS[type],
                backgroundColor:
                  trajectory.type === type ? TRAJECTORY_COLORS[type] : `${TRAJECTORY_COLORS[type]}1f`,
              }}
            >
              {TRAJECTORY_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Start (ms)">
            <NumberInput
              step={50}
              value={trajectory.startMs}
              onChange={(event) => commit({ startMs: Math.max(0, Number(event.target.value)) })}
            />
          </Field>
          <Field label="Duration (ms)">
            <NumberInput
              step={50}
              value={trajectory.durationMs}
              onChange={(event) => commit({ durationMs: Math.max(50, Number(event.target.value)) })}
            />
          </Field>
        </div>

        <Field label="Control points">
          <div className="flex flex-wrap gap-1">
            {trajectory.controlPoints.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectPoint(index)}
                className={cn(
                  'h-6 w-6 rounded-md border text-[10px] font-semibold',
                  selectedPointIndex === index
                    ? 'border-sky-300 bg-sky-500/25 text-sky-100'
                    : 'border-white/10 bg-panel-950/60 text-slate-400',
                )}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              title="Append a point"
              onClick={() => {
                const last = trajectory.controlPoints[trajectory.controlPoints.length - 1]!;
                commit({
                  controlPoints: [
                    ...trajectory.controlPoints,
                    { x: last.x + 0.6, y: last.y, z: last.z },
                  ],
                });
              }}
              className="h-6 w-6 rounded-md border border-white/10 bg-panel-950/60 text-slate-400 hover:text-slate-200"
            >
              <Plus className="mx-auto h-3 w-3" />
            </button>
          </div>
        </Field>

        {point && selectedPointIndex !== null && (
          <div className="grid grid-cols-3 gap-1.5">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <Field key={axis} label={`${axis.toUpperCase()} (m)`}>
                <NumberInput
                  step={0.1}
                  value={Number(point[axis].toFixed(2))}
                  onChange={(event) => {
                    const points = trajectory.controlPoints.map((item, index) =>
                      index === selectedPointIndex
                        ? { ...item, [axis]: Number(event.target.value) }
                        : item,
                    );
                    commit({ controlPoints: points });
                  }}
                />
              </Field>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => commit({ visible: !trajectory.visible })}
            title="Hide this path in playback"
          >
            {trajectory.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {trajectory.visible ? 'Visible' : 'Hidden'}
          </Button>
          <Button variant="danger" onClick={removeTrajectory}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function KeyframeInspector({ keyframe }: { keyframe: Keyframe }) {
  const retime = trpc.keyframe.retime.useMutation();
  const removeKeyframe = trpc.keyframe.delete.useMutation();
  const setPlayers = usePlayStore((state) => state.setPlayers);

  return (
    <Panel title={`Keyframe · ${(keyframe.timestampMs / 1000).toFixed(2)} s`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Time (ms)">
            <NumberInput
              step={50}
              defaultValue={keyframe.timestampMs}
              onBlur={(event) => {
                const timestampMs = Math.max(0, Number(event.target.value));
                usePlayStore.getState().setKeyframes(
                  usePlayStore
                    .getState()
                    .keyframes
                    .map((item) => (item.id === keyframe.id ? { ...item, timestampMs } : item))
                    .sort((a, b) => a.timestampMs - b.timestampMs),
                );
                retime.mutate(
                  { id: keyframe.id, timestampMs },
                  { onError: (error) => console.error(error) },
                );
              }}
            />
          </Field>
          <Field label="Players">
            <div className="input tabular-nums">{keyframe.playerStates.length}</div>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => useTimelineStore.getState().setCurrent(keyframe.timestampMs)}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Go to
          </Button>
          <Button
            className="flex-1"
            onClick={() => setPlayers(keyframe.playerStates)}
            title="Load this keyframe into the editable roster"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            Load pose
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              removeKeyframe.mutate(
                { id: keyframe.id },
                {
                  onSuccess: () => {
                    usePlayStore.getState().removeKeyframe(keyframe.id);
                    useEditorStore.getState().selectKeyframe(null);
                  },
                },
              )
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PlayerInspector({ player }: { player: PlayerState }) {
  const setPlayerPose = usePlayStore((state) => state.setPlayerPose);
  return (
    <Panel title={`Player #${player.playerId.replace(/\D/g, '')} · ${ROLE_LABELS[player.role]}`}>
      <div className="space-y-2 text-xs text-slate-300">
        <Field label="Pose">
          <Select
            value={player.pose}
            onChange={(event) => setPlayerPose(player.playerId, event.target.value as PlayerState['pose'])}
          >
            {POSES.map((pose) => (
              <option key={pose} value={pose}>
                {POSE_LABELS[pose]}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-[10px] text-slate-500">
          Position {player.position.x.toFixed(1)}, {player.position.z.toFixed(1)} · facing{' '}
          {Math.round(player.rotationY)}°
        </p>
      </div>
    </Panel>
  );
}

function InspectorTab() {
  const selectedTrajectoryId = useEditorStore((store) => store.selectedTrajectoryId);
  const selectedKeyframeId = useEditorStore((store) => store.selectedKeyframeId);
  const selectedPlayerId = useEditorStore((store) => store.selectedPlayerId);
  const trajectories = usePlayStore((state) => state.trajectories);
  const keyframes = usePlayStore((state) => state.keyframes);
  const players = usePlayStore((state) => state.players);

  const trajectory = trajectories.find((item) => item.id === selectedTrajectoryId) ?? null;
  const keyframe = keyframes.find((item) => item.id === selectedKeyframeId) ?? null;
  const player = players.find((item) => item.playerId === selectedPlayerId) ?? null;

  if (player) return <PlayerInspector player={player} />;
  if (trajectory) return <TrajectoryInspector trajectory={trajectory} />;
  if (keyframe) return <KeyframeInspector keyframe={keyframe} />;

  return (
    <Panel title="Inspector">
      <p className="text-[11px] leading-relaxed text-slate-400">
        Select a player to change their pose, a ball path to edit its flight, or a keyframe diamond
        on the timeline to retime it.
      </p>
      <ul className="mt-3 space-y-1 text-[11px] text-slate-500">
        <li>• Drag players on the court, then press K to record.</li>
        <li>• Click a trajectory tube to edit its points.</li>
        <li>• Scrub the timeline to preview the animation.</li>
      </ul>
    </Panel>
  );
}

function PhasesTab() {
  const phases = usePlayStore((state) => state.phases);
  const trajectories = usePlayStore((state) => state.trajectories);
  const createPhase = trpc.phase.create.useMutation();
  const updatePhase = trpc.phase.update.useMutation();
  const deletePhase = trpc.phase.delete.useMutation();

  const addPhase = (name?: string, startMs?: number, endMs?: number) => {
    const play = usePlayStore.getState().play;
    if (!play) return;
    const start = startMs ?? Math.round(useTimelineStore.getState().currentMs);
    const end = endMs ?? start + 1500;
    createPhase.mutate(
      { playId: play.id, name: name ?? `Phase ${phases.length + 1}`, startMs: start, endMs: end },
      { onSuccess: (phase) => usePlayStore.getState().addPhase(phase) },
    );
  };

  const addFromBallPaths = () => {
    for (const trajectory of trajectories) {
      addPhase(
        TRAJECTORY_LABELS[trajectory.type],
        trajectory.startMs,
        trajectory.startMs + trajectory.durationMs,
      );
    }
  };

  return (
    <div className="space-y-3">
      <Panel title="Phases" actions={<Flag className="h-3.5 w-3.5 text-slate-500" />}>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => addPhase()}>
            <Plus className="h-3.5 w-3.5" />
            At playhead
          </Button>
          <Button className="flex-1" onClick={addFromBallPaths} disabled={trajectories.length === 0}>
            From ball paths
          </Button>
        </div>
      </Panel>

      {phases.map((phase: Phase) => (
        <Panel
          key={phase.id}
          title={
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: phaseColor(phase.name) }}
              />
              {phase.name}
            </span>
          }
        >
          <div className="space-y-2">
            <Field label="Name">
              <TextInput
                defaultValue={phase.name}
                onBlur={(event) => {
                  const name = event.target.value.trim() || phase.name;
                  usePlayStore.getState().updatePhase(phase.id, { name });
                  updatePhase.mutate({ id: phase.id, name });
                }}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start (ms)">
                <NumberInput
                  step={50}
                  defaultValue={phase.startMs}
                  onBlur={(event) => {
                    const startMs = Math.max(0, Number(event.target.value));
                    usePlayStore.getState().updatePhase(phase.id, { startMs });
                    updatePhase.mutate({ id: phase.id, startMs });
                  }}
                />
              </Field>
              <Field label="End (ms)">
                <NumberInput
                  step={50}
                  defaultValue={phase.endMs}
                  onBlur={(event) => {
                    const endMs = Math.max(1, Number(event.target.value));
                    usePlayStore.getState().updatePhase(phase.id, { endMs });
                    updatePhase.mutate({ id: phase.id, endMs });
                  }}
                />
              </Field>
            </div>
            <Field label="Coaching note">
              <TextArea
                defaultValue={phase.coachingNote ?? ''}
                placeholder="What should happen in this phase?"
                onBlur={(event) => {
                  const coachingNote = event.target.value;
                  usePlayStore.getState().updatePhase(phase.id, { coachingNote });
                  updatePhase.mutate({ id: phase.id, coachingNote });
                }}
              />
            </Field>
            <Button
              variant="danger"
              className="w-full"
              onClick={() =>
                deletePhase.mutate(
                  { id: phase.id },
                  {
                    onSuccess: () => usePlayStore.getState().removePhase(phase.id),
                  },
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete phase
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function NotesTab() {
  const annotations = usePlayStore((state) => state.annotations);
  const pending = useEditorStore((store) => store.pendingAnnotation);
  const [text, setText] = useState('');
  const [color, setColor] = useState(ANNOTATION_COLORS[1]!);
  const createAnnotation = trpc.annotation.create.useMutation();
  const updateAnnotation = trpc.annotation.update.useMutation();
  const deleteAnnotation = trpc.annotation.delete.useMutation();

  const place = () => {
    const play = usePlayStore.getState().play;
    if (!play || !pending || !text.trim()) return;
    const currentMs = Math.round(useTimelineStore.getState().currentMs);
    createAnnotation.mutate(
      {
        playId: play.id,
        text: text.trim(),
        position: pending,
        visibleFromMs: 0,
        visibleToMs: Math.max(3000, currentMs + 2000),
        color,
      },
      {
        onSuccess: (annotation) => {
          usePlayStore.getState().addAnnotation(annotation);
          useEditorStore.getState().setPendingAnnotation(null);
          useEditorStore.getState().setTool('select');
          useEditorStore.getState().selectAnnotation(annotation.id);
          setText('');
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      {pending ? (
        <Panel title="New 3D note">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500">
              Hanging at {pending.x.toFixed(1)}, {pending.y.toFixed(1)}, {pending.z.toFixed(1)}
            </p>
            <TextInput
              value={text}
              autoFocus
              placeholder="e.g. Setter releases to the net"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') place();
              }}
            />
            <div className="flex gap-1">
              {ANNOTATION_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2',
                    option === color ? 'border-white' : 'border-transparent',
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={place} disabled={!text.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Place note
              </Button>
              <Button onClick={() => useEditorStore.getState().setPendingAnnotation(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel title="3D notes" actions={<MapPin className="h-3.5 w-3.5 text-slate-500" />}>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Pick the <strong>Note</strong> tool, click the court where the note should appear, then
            type its text here.
          </p>
        </Panel>
      )}

      {annotations.map((annotation: Annotation) => (
        <Panel
          key={annotation.id}
          title={
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: annotation.color }}
              />
              {annotation.text}
            </span>
          }
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Visible from (ms)">
                <NumberInput
                  step={100}
                  defaultValue={annotation.visibleFromMs ?? 0}
                  onBlur={(event) => {
                    const visibleFromMs = Math.max(0, Number(event.target.value));
                    usePlayStore.getState().updateAnnotation(annotation.id, { visibleFromMs });
                    updateAnnotation.mutate({ id: annotation.id, visibleFromMs });
                  }}
                />
              </Field>
              <Field label="Visible to (ms)">
                <NumberInput
                  step={100}
                  defaultValue={annotation.visibleToMs ?? 0}
                  onBlur={(event) => {
                    const visibleToMs = Math.max(1, Number(event.target.value));
                    usePlayStore.getState().updateAnnotation(annotation.id, { visibleToMs });
                    updateAnnotation.mutate({ id: annotation.id, visibleToMs });
                  }}
                />
              </Field>
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={() =>
                deleteAnnotation.mutate(
                  { id: annotation.id },
                  { onSuccess: () => usePlayStore.getState().removeAnnotation(annotation.id) },
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete note
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function CameraTab() {
  const cameraPaths = usePlayStore((state) => state.cameraPaths);
  const presetId = useCameraStore((state) => state.presetId);
  const previewPathId = useCameraStore((state) => state.previewPathId);
  const selectedPathId = useEditorStore((store) => store.selectedCameraPathId);
  const [pathName, setPathName] = useState('Coaching view');
  const createPath = trpc.camera.createPath.useMutation();
  const updatePath = trpc.camera.updatePath.useMutation();
  const deletePath = trpc.camera.deletePath.useMutation();

  const selectedPath: CameraPath | null =
    cameraPaths.find((path) => path.id === selectedPathId) ?? null;

  const create = () => {
    const play = usePlayStore.getState().play;
    if (!play || !pathName.trim()) return;
    createPath.mutate(
      { playId: play.id, name: pathName.trim(), keyframes: [] },
      {
        onSuccess: (path) => {
          usePlayStore.getState().addCameraPath(path);
          useEditorStore.getState().selectCameraPath(path.id);
          useCameraStore.getState().setPreviewPath(path.id);
        },
      },
    );
  };

  const capture = () => {
    const captured = bridge.captureCamera?.();
    if (!captured || !selectedPath) return;
    const timestampMs = Math.round(useTimelineStore.getState().currentMs);
    const keyframes = [
      ...selectedPath.keyframes.filter((keyframe) => keyframe.timestampMs !== timestampMs),
      { timestampMs, position: captured.position, target: captured.target, fov: captured.fov, easing: 'easeInOut' as const },
    ].sort((a, b) => a.timestampMs - b.timestampMs);
    usePlayStore.getState().updateCameraPath(selectedPath.id, { keyframes });
    updatePath.mutate(
      { id: selectedPath.id, keyframes },
      { onError: (error) => console.error('Could not save camera keyframe', error) },
    );
  };

  return (
    <div className="space-y-3">
      <Panel title="Static presets" actions={<CameraIcon className="h-3.5 w-3.5 text-slate-500" />}>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(CAMERA_PRESETS_MAP) as CameraPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => useCameraStore.getState().setPreset(id)}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-[11px] font-medium transition',
                presetId === id && previewPathId === null
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                  : 'border-white/10 bg-panel-950/50 text-slate-300 hover:border-white/25',
              )}
            >
              {CAMERA_PRESETS_MAP[id].label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Camera paths" actions={<Clapperboard className="h-3.5 w-3.5 text-slate-500" />}>
        <div className="space-y-2">
          {cameraPaths.map((path: CameraPath) => (
            <div
              key={path.id}
              className={cn(
                'rounded-lg border p-2',
                path.id === selectedPathId ? 'border-sky-400/40 bg-sky-500/5' : 'border-white/10',
              )}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => useEditorStore.getState().selectCameraPath(path.id)}
              >
                <span className="text-xs font-medium text-slate-200">{path.name}</span>
                <span className="chip">{path.keyframes.length} keys</span>
              </button>
              <div className="mt-2 flex gap-1.5">
                <Button
                  className="flex-1"
                  variant={previewPathId === path.id ? 'primary' : 'default'}
                  onClick={() =>
                    useCameraStore.getState().setPreviewPath(
                      previewPathId === path.id ? null : path.id,
                    )
                  }
                >
                  <Video className="h-3 w-3" />
                  {previewPathId === path.id ? 'Playing' : 'Preview'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    deletePath.mutate(
                      { id: path.id },
                      {
                        onSuccess: () => {
                          usePlayStore.getState().removeCameraPath(path.id);
                          if (previewPathId === path.id) useCameraStore.getState().setPreviewPath(null);
                          if (selectedPathId === path.id) useEditorStore.getState().selectCameraPath(null);
                        },
                      },
                    )
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-1.5">
            <TextInput
              value={pathName}
              onChange={(event) => setPathName(event.target.value)}
              placeholder="New path name"
            />
            <Button onClick={create} disabled={!pathName.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Panel>

      {selectedPath && (
        <Panel title={`Editing · ${selectedPath.name}`}>
          <div className="space-y-2">
            <Field label="Name">
              <TextInput
                defaultValue={selectedPath.name}
                onBlur={(event) => {
                  const name = event.target.value.trim() || selectedPath.name;
                  usePlayStore.getState().updateCameraPath(selectedPath.id, { name });
                  updatePath.mutate({ id: selectedPath.id, name });
                }}
              />
            </Field>
            <Button variant="primary" className="w-full" onClick={capture}>
              <CameraIcon className="h-3.5 w-3.5" />
              Capture view at playhead
            </Button>
            <ul className="space-y-1">
              {selectedPath.keyframes.map((keyframe, index) => (
                <li
                  key={`${keyframe.timestampMs}-${index}`}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-panel-950/50 px-2 py-1 text-[11px] text-slate-300"
                >
                  <span className="tabular-nums">
                    {(keyframe.timestampMs / 1000).toFixed(2)} s · fov {keyframe.fov}
                  </span>
                  <button
                    type="button"
                    title="Delete camera key"
                    onClick={() => {
                      const keyframes = selectedPath.keyframes.filter((_, i) => i !== index);
                      usePlayStore.getState().updateCameraPath(selectedPath.id, { keyframes });
                      updatePath.mutate({ id: selectedPath.id, keyframes });
                    }}
                    className="text-slate-500 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
              {selectedPath.keyframes.length === 0 && (
                <li className="text-[10px] text-slate-500">
                  No keys yet — move the camera (orbit), set the playhead, then capture.
                </li>
              )}
            </ul>
            <Toggle
              checked={previewPathId === selectedPath.id}
              label="Drive the camera with this path"
              onChange={(value) =>
                useCameraStore.getState().setPreviewPath(value ? selectedPath.id : null)
              }
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('inspector');
  const tabs = useMemo(
    () => [
      { value: 'inspector' as const, label: <><ListTree className="h-3 w-3" /> Edit</> },
      { value: 'phases' as const, label: <><Flag className="h-3 w-3" /> Phases</> },
      { value: 'notes' as const, label: <><MessageSquare className="h-3 w-3" /> Notes</> },
      { value: 'camera' as const, label: <><CameraIcon className="h-3 w-3" /> Camera</> },
    ],
    [],
  );

  return (
    <aside className="scroll-thin flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/5 bg-panel-900/60 p-3">
      <Segmented<Tab> value={tab} onChange={setTab} options={tabs} />
      {tab === 'inspector' && <InspectorTab />}
      {tab === 'phases' && <PhasesTab />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'camera' && <CameraTab />}
      <p className="text-[10px] leading-relaxed text-slate-600">
        Tip: use <strong>Present</strong> from the library to teach this play full-screen on a
        phone at the gym.
      </p>
    </aside>
  );
}
