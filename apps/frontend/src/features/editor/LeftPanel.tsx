import { useState } from 'react';
import {
  Box,
  CircleDot,
  MapPin,
  MousePointer2,
  Route,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  COURT_TYPES,
  DEFAULT_TRAJECTORY_DURATION_MS,
  PLAY_CATEGORY_LABELS,
  PLAY_CATEGORIES,
  POSE_LABELS,
  POSES,
  ROLE_COLORS,
  ROLE_LABELS,
  TRAJECTORY_COLORS,
  TRAJECTORY_LABELS,
  TRAJECTORY_TYPES,
  type CourtType,
  type PlayCategory,
  type Pose,
} from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { guessClip } from '../../lib/playerModel';
import { trpc } from '../../lib/trpc';
import { useModelStore } from '../../stores/modelStore';
import { basePlayersFor, usePlayStore } from '../../stores/playStore';
import { useEditorStore, type EditorTool } from '../../stores/editorStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Button, Field, NumberInput, Panel, Segmented, Select, TextArea, Toggle } from '../../components/ui';

function ToolPanel() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  return (
    <Panel title="Authoring tools">
      <Segmented<EditorTool>
        value={tool}
        onChange={setTool}
        options={[
          { value: 'select', label: <><MousePointer2 className="h-3.5 w-3.5" /> Select</>, title: 'Select, move players, edit points' },
          { value: 'draw-trajectory', label: <><Route className="h-3.5 w-3.5" /> Ball</>, title: 'Click the court to draw a ball trajectory' },
          { value: 'place-annotation', label: <><MapPin className="h-3.5 w-3.5" /> Note</>, title: 'Click the court to place a coaching note' },
        ]}
      />
    </Panel>
  );
}

function DrawPanel() {
  const trajectoryType = useEditorStore((state) => state.trajectoryType);
  const setTrajectoryType = useEditorStore((state) => state.setTrajectoryType);
  const brushHeight = useEditorStore((state) => state.brushHeight);
  const setBrushHeight = useEditorStore((state) => state.setBrushHeight);
  const draftPoints = useEditorStore((state) => state.draftPoints);
  const createTrajectory = trpc.trajectory.create.useMutation();

  const finish = () => {
    const play = usePlayStore.getState().play;
    if (!play || draftPoints.length < 2) return;
    const startMs = Math.round(useTimelineStore.getState().currentMs);
    createTrajectory.mutate(
      {
        playId: play.id,
        type: trajectoryType,
        controlPoints: draftPoints,
        startMs,
        durationMs: DEFAULT_TRAJECTORY_DURATION_MS[trajectoryType],
        color: TRAJECTORY_COLORS[trajectoryType],
      },
      {
        onSuccess: (trajectory) => {
          const store = usePlayStore.getState();
          store.addTrajectory(trajectory);
          const editor = useEditorStore.getState();
          editor.setTool('select');
          editor.clearDraft();
          editor.selectTrajectory(trajectory.id);
        },
        onError: (error) => console.error('Could not save trajectory', error),
      },
    );
  };

  return (
    <Panel title="Ball trajectory">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {TRAJECTORY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTrajectoryType(type)}
              className={cn(
                'rounded-md border px-1.5 py-1 text-[10px] font-semibold transition',
                trajectoryType === type ? 'text-slate-950' : 'text-slate-300 hover:border-white/25',
              )}
              style={{
                borderColor: TRAJECTORY_COLORS[type],
                backgroundColor: trajectoryType === type ? TRAJECTORY_COLORS[type] : `${TRAJECTORY_COLORS[type]}1f`,
              }}
            >
              {TRAJECTORY_LABELS[type]}
            </button>
          ))}
        </div>

        <Field label={`Control point height · ${brushHeight.toFixed(1)} m`}>
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={brushHeight}
            onChange={(event) => setBrushHeight(Number(event.target.value))}
            className="w-full accent-sky-400"
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-slate-400">
          Click the court to drop control points at the height above. {draftPoints.length} point
          {draftPoints.length === 1 ? '' : 's'} placed — at least 2 needed.
        </p>

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={draftPoints.length < 2 || createTrajectory.isLoading}
            onClick={finish}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Finish path
          </Button>
          <Button
            onClick={() => useEditorStore.getState().clearDraft()}
            disabled={draftPoints.length === 0}
          >
            Clear
          </Button>
        </div>
        <p className="text-[10px] text-slate-500">Esc cancels. Switch to Select to drag the curve.</p>
      </div>
    </Panel>
  );
}

function PlayerModelPanel() {
  const modelUrl = useModelStore((store) => store.modelUrl);
  const setModelUrl = useModelStore((store) => store.setModelUrl);
  const yawOffsetDeg = useModelStore((store) => store.yawOffsetDeg);
  const setYawOffset = useModelStore((store) => store.setYawOffset);
  const scale = useModelStore((store) => store.scale);
  const setScale = useModelStore((store) => store.setScale);
  const autoScale = useModelStore((store) => store.autoScale);
  const setAutoScale = useModelStore((store) => store.setAutoScale);
  const timeScale = useModelStore((store) => store.timeScale);
  const setTimeScale = useModelStore((store) => store.setTimeScale);
  const availableClips = useModelStore((store) => store.availableClips);
  const clipMap = useModelStore((store) => store.clipMap);
  const setClip = useModelStore((store) => store.setClip);
  const [urlDraft, setUrlDraft] = useState(modelUrl ?? '');

  return (
    <Panel title="Player model" actions={<Box className="h-3.5 w-3.5 text-slate-500" />}>
      <div className="space-y-3">
        <Segmented<'mannequin' | 'glb'>
          value={modelUrl ? 'glb' : 'mannequin'}
          onChange={(value) => {
            if (value === 'mannequin') setModelUrl(null);
            else if (urlDraft.trim()) setModelUrl(urlDraft.trim());
          }}
          options={[
            { value: 'mannequin', label: 'Mannequin' },
            { value: 'glb', label: 'GLB model' },
          ]}
        />

        <Field label="Model URL" hint="Drop licensed .glb files in public/models/ and reference them here">
          <div className="flex gap-1.5">
            <input
              className="input"
              value={urlDraft}
              placeholder="/models/player.glb"
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setModelUrl(urlDraft.trim() || null);
              }}
            />
            <Button onClick={() => setModelUrl(urlDraft.trim() || null)}>Load</Button>
          </div>
        </Field>

        <label className="btn w-full cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Open local .glb
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const objectUrl = URL.createObjectURL(file);
              setUrlDraft(objectUrl);
              setModelUrl(objectUrl);
              event.target.value = '';
            }}
          />
        </label>
        {modelUrl && (
          <p className="break-all text-[10px] text-slate-500">
            Loaded: {modelUrl.startsWith('blob:') ? 'local file (re-open after reload)' : modelUrl}
          </p>
        )}

        {modelUrl && (
          <div className="space-y-2 rounded-lg border border-white/5 bg-panel-950/50 p-2">
            <Field label={`Facing offset · ${Math.round(yawOffsetDeg)}°`}>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={yawOffsetDeg}
                onChange={(event) => setYawOffset(Number(event.target.value))}
                className="w-full accent-sky-400"
              />
            </Field>
            <Field label={`Scale · ${scale.toFixed(2)}×`}>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.05}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                className="w-full accent-sky-400"
              />
            </Field>
            <Field label={`Animation speed · ${timeScale.toFixed(2)}×`}>
              <input
                type="range"
                min={0.25}
                max={2}
                step={0.05}
                value={timeScale}
                onChange={(event) => setTimeScale(Number(event.target.value))}
                className="w-full accent-sky-400"
              />
            </Field>
            <Toggle checked={autoScale} onChange={setAutoScale} label="Auto-scale to 1.85 m" />
          </div>
        )}

        {modelUrl && availableClips.length > 0 && (
          <div className="space-y-2">
            <p className="field-label">Pose → clip mapping</p>
            <div className="scroll-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {POSES.map((pose) => {
                const guessed = guessClip(pose, availableClips);
                return (
                  <div key={pose} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[10px] text-slate-400">{POSE_LABELS[pose]}</span>
                    <Select
                      className="py-1 text-[11px]"
                      value={clipMap[pose] ?? ''}
                      onChange={(event) => setClip(pose, event.target.value || null)}
                    >
                      <option value="">Auto{guessed ? ` · ${guessed}` : ' · none'}</option>
                      {availableClips.map((clip) => (
                        <option key={clip} value={clip}>
                          {clip}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {modelUrl && availableClips.length === 0 && (
          <p className="text-[10px] text-slate-500">Loading model clips…</p>
        )}
      </div>
    </Panel>
  );
}

function ViewToggles() {
  const showZones = useEditorStore((state) => state.showZones);
  const showGhosts = useEditorStore((state) => state.showGhosts);
  const showTrajectories = useEditorStore((state) => state.showTrajectories);
  const showRoster = useEditorStore((state) => state.showRoster);
  return (
    <Panel title="View">
      <div className="space-y-0.5">
        <Toggle checked={showZones} onChange={() => useEditorStore.getState().toggleZones()} label="Court zones 1–6" />
        <Toggle checked={showGhosts} onChange={() => useEditorStore.getState().toggleGhosts()} label="Movement ghost trails" />
        <Toggle checked={showTrajectories} onChange={() => useEditorStore.getState().toggleTrajectories()} label="Ball paths" />
        <Toggle checked={showRoster} onChange={() => useEditorStore.getState().toggleRoster()} label="Jersey numbers" />
      </div>
    </Panel>
  );
}

function PlayDetails() {
  const play = usePlayStore((state) => state.play);
  const updatePlay = trpc.play.update.useMutation();
  if (!play) return null;

  const patch = (values: Partial<typeof play>) => {
    usePlayStore.getState().setPlay({ ...play, ...values });
    updatePlay.mutate(
      { id: play.id, ...values },
      { onError: (error) => console.error('Could not update play', error) },
    );
  };

  return (
    <Panel title="Play details">
      <div className="space-y-3">
        <Field label="Category">
          <Select
            value={play.category}
            onChange={(event) => patch({ category: event.target.value as PlayCategory })}
          >
            {PLAY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PLAY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Rotation">
            <Select
              value={String(play.rotation)}
              onChange={(event) => patch({ rotation: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6].map((rotation) => (
                <option key={rotation} value={rotation}>
                  Rotation {rotation}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Net height (m)">
            <NumberInput
              step={0.01}
              value={play.netHeight}
              onChange={(event) => patch({ netHeight: Number(event.target.value) })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Court">
            <Select
              value={play.courtType}
              onChange={(event) => patch({ courtType: event.target.value as CourtType })}
            >
              {COURT_TYPES.map((courtType) => (
                <option key={courtType} value={courtType}>
                  {courtType === 'indoor' ? 'Indoor' : 'Beach'}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => usePlayStore.getState().setPlayers(basePlayersFor(play.rotation))}
              title="Reset all players to base positions for this rotation"
            >
              Base positions
            </Button>
          </div>
        </div>

        <Field label="Description">
          <TextArea
            value={play.description ?? ''}
            placeholder="What is this play for?"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>

        <Field label="Coaching notes">
          <TextArea
            value={play.coachingNotes ?? ''}
            placeholder="Keys, reads, reminders for the team"
            onChange={(event) => patch({ coachingNotes: event.target.value })}
          />
        </Field>

        <Toggle
          checked={play.isPublic}
          label="Public share link"
          onChange={(value) =>
            updatePlay.mutate(
              { id: play.id, isPublic: value },
              { onSuccess: (updated) => usePlayStore.getState().setPlay(updated) },
            )
          }
        />
      </div>
    </Panel>
  );
}

function RosterPanel() {
  const players = usePlayStore((state) => state.players);
  const selectedPlayerId = useEditorStore((state) => state.selectedPlayerId);
  const selectPlayer = useEditorStore((state) => state.selectPlayer);

  return (
    <Panel title="Roster" bodyClassName="p-2">
      <ul className="space-y-0.5">
        {players.map((player) => {
          const selected = player.playerId === selectedPlayerId;
          return (
            <li key={player.playerId}>
              <button
                type="button"
                onClick={() => selectPlayer(player.playerId)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition',
                  selected ? 'bg-sky-500/15 text-sky-100' : 'text-slate-300 hover:bg-white/5',
                )}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-950"
                  style={{ backgroundColor: ROLE_COLORS[player.role] }}
                >
                  {player.playerId.replace(/\D/g, '')}
                </span>
                <span className="flex-1 truncate">{ROLE_LABELS[player.role]}</span>
                <CircleDot className="h-3 w-3 text-slate-600" />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function LeftPanel() {
  const tool = useEditorStore((state) => state.tool);
  const selectedPlayerId = useEditorStore((state) => state.selectedPlayerId);
  const players = usePlayStore((state) => state.players);
  const selected = players.find((player) => player.playerId === selectedPlayerId) ?? null;
  const updatePlayer = usePlayStore((state) => state.updatePlayer);
  const setPlayerPose = usePlayStore((state) => state.setPlayerPose);

  return (
    <aside className="scroll-thin flex w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/5 bg-panel-900/60 p-3">
      <ToolPanel />
      {tool === 'draw-trajectory' && <DrawPanel />}
      {tool === 'place-annotation' && (
        <Panel title="Coaching note">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Click the court to choose where the note hangs in 3D. Then type its text in the Notes
            tab of the inspector panel.
          </p>
        </Panel>
      )}

      {selected && (
        <Panel title={`Selected · #${selected.playerId.replace(/\D/g, '')}`}>
          <div className="space-y-3">
            <Field label="Pose">
              <Select
                value={selected.pose}
                onChange={(event) =>
                  setPlayerPose(selected.playerId, event.target.value as Pose)
                }
              >
                {POSES.map((pose: Pose) => (
                  <option key={pose} value={pose}>
                    {POSE_LABELS[pose]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="X (m)">
                <NumberInput
                  value={Number(selected.position.x.toFixed(2))}
                  onChange={(event) =>
                    updatePlayer(selected.playerId, {
                      position: { ...selected.position, x: Number(event.target.value) },
                    })
                  }
                />
              </Field>
              <Field label="Z (m)">
                <NumberInput
                  value={Number(selected.position.z.toFixed(2))}
                  onChange={(event) =>
                    updatePlayer(selected.playerId, {
                      position: { ...selected.position, z: Number(event.target.value) },
                    })
                  }
                />
              </Field>
            </div>
            <Field label={`Facing · ${Math.round(selected.rotationY)}°`}>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={selected.rotationY}
                onChange={(event) =>
                  updatePlayer(selected.playerId, { rotationY: Number(event.target.value) })
                }
                className="w-full accent-sky-400"
              />
            </Field>
            <p className="text-[10px] text-slate-500">
              Drag the player on the court to move them, then press <kbd>K</kbd> to record a
              keyframe.
            </p>
          </div>
        </Panel>
      )}

      <ViewToggles />
      <PlayerModelPanel />
      <PlayDetails />
      <RosterPanel />
      <p className="flex items-center gap-1 text-[10px] text-slate-600">
        <Trash2 className="h-3 w-3" /> Delete removes the current selection.
      </p>
    </aside>
  );
}
