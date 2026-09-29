import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, MousePointerClick, Users } from 'lucide-react';
import { Vector3 } from 'three';
import {
  CAMERA_PRESETS,
  CAMERA_PRESETS_MAP,
  FORMATION_INFO,
  FORMATIONS,
  type CameraPresetId,
} from '@tempo/shared-types';
import { cn } from '../../lib/cn';
import { bridge } from '../../lib/bridge';
import { Button, Select, TextInput } from '../../components/ui';
import { useCameraStore } from '../../stores/cameraStore';
import { useEditorStore } from '../../stores/editorStore';
import { useQuickStore, type QuickFormation } from '../../stores/quickStore';
import { Scene } from '../court/Scene';
import { OrientationNotice } from './OrientationNotice';
import { QuickHUD } from './QuickHUD';
import { QuickRoster } from './QuickRoster';

const NUDGE_FORWARD = new Vector3();
const NUDGE_RIGHT = new Vector3();
const NUDGE_UP = new Vector3(0, 1, 0);

function QuickCameraControls() {
  const presetId = useCameraStore((state) => state.presetId);
  const setPreset = useCameraStore((state) => state.setPreset);
  return (
    <div className="pointer-events-auto absolute right-3 top-20 z-20 flex flex-col items-end gap-1">
      <span className="panel flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">
        <Camera className="h-3 w-3" />
        Angles
      </span>
      {CAMERA_PRESETS.map((id: CameraPresetId) => (
        <button
          key={id}
          type="button"
          onClick={() => setPreset(id)}
          className={cn(
            'panel px-2.5 py-1 text-[11px] font-medium transition',
            presetId === id
              ? 'border-sky-400/50 text-sky-200'
              : 'text-slate-400 hover:text-slate-100',
          )}
        >
          {CAMERA_PRESETS_MAP[id].label}
        </button>
      ))}
    </div>
  );
}

export function QuickPlayPage() {
  const name = useQuickStore((state) => state.name);
  const rotation = useQuickStore((state) => state.rotation);
  const formation = useQuickStore((state) => state.formation);
  const libero = useQuickStore((state) => state.libero);
  const step = useQuickStore((state) => state.step);
  const rosterOpen = useQuickStore((state) => state.rosterOpen);
  const setName = useQuickStore((state) => state.setName);
  const setRotation = useQuickStore((state) => state.setRotation);
  const setFormation = useQuickStore((state) => state.setFormation);
  const setLibero = useQuickStore((state) => state.setLibero);
  const toggleRoster = useQuickStore((state) => state.toggleRoster);
  const hasCustom = useQuickStore((state) => Object.keys(state.customFormations).length > 0);

  useEffect(() => {
    useQuickStore.getState().start();
    return () => useQuickStore.getState().stop();
  }, []);

  useEffect(() => {
    useEditorStore.getState().setDragEnabled(step === 'receive' || step === 'attack');
    if (step !== 'attack') useEditorStore.getState().clearSelection();
  }, [step]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    const quick = useQuickStore.getState();
    if (!quick.active) return;
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifier && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) quick.redo();
      else quick.undo();
      return;
    }
    if (modifier && key === 'y') {
      event.preventDefault();
      quick.redo();
      return;
    }
    if (event.key >= '1' && event.key <= '4') {
      const index = Number(event.key) - 1;
      const available = index < 3 ? index < quick.ballTargets.length : Boolean(quick.spikeTarget);
      if (available) {
        event.preventDefault();
        if (index < 3 && quick.step === 'play') quick.setStep('ball');
        quick.selectTarget(quick.selectedTarget === index ? null : index);
      }
      return;
    }
    if (event.key.startsWith('Arrow') && quick.selectedTarget !== null) {
      event.preventDefault();
      const amount = event.shiftKey ? 1 : 0.25;
      const camera = bridge.camera;
      if (!camera) return;

      // Nudge relative to what the coach sees: project the camera's view
      // direction and screen-right onto the floor plane.
      camera.getWorldDirection(NUDGE_FORWARD);
      NUDGE_FORWARD.y = 0;
      if (NUDGE_FORWARD.lengthSq() < 1e-6) {
        // Looking straight down (Top Down preset): fall back to the camera's
        // local up axis projected on the floor.
        NUDGE_FORWARD.setFromMatrixColumn(camera.matrixWorld, 1);
        NUDGE_FORWARD.y = 0;
        if (NUDGE_FORWARD.lengthSq() < 1e-6) NUDGE_FORWARD.set(0, 0, -1);
      }
      NUDGE_FORWARD.normalize();
      NUDGE_RIGHT.crossVectors(NUDGE_FORWARD, NUDGE_UP).normalize();

      let dx = 0;
      let dz = 0;
      if (event.key === 'ArrowUp') {
        dx = NUDGE_FORWARD.x;
        dz = NUDGE_FORWARD.z;
      } else if (event.key === 'ArrowDown') {
        dx = -NUDGE_FORWARD.x;
        dz = -NUDGE_FORWARD.z;
      } else if (event.key === 'ArrowRight') {
        dx = NUDGE_RIGHT.x;
        dz = NUDGE_RIGHT.z;
      } else if (event.key === 'ArrowLeft') {
        dx = -NUDGE_RIGHT.x;
        dz = -NUDGE_RIGHT.z;
      }
      quick.nudgeSelected(dx * amount, dz * amount);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-panel-950">
      <Scene quick />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-center gap-2 p-3">
        <Link to="/" className="btn pointer-events-auto">
          <ArrowLeft className="h-3.5 w-3.5" />
          Library
        </Link>
        <div className="panel pointer-events-auto hidden items-center gap-2 px-3 py-1.5 sm:flex">
          <MousePointerClick className="h-3.5 w-3.5 text-sky-300" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Interactive play
          </span>
        </div>
        <Button
          variant={rosterOpen ? 'primary' : 'default'}
          className="pointer-events-auto"
          onClick={toggleRoster}
          title="Show who is who and their court position"
        >
          <Users className="h-3.5 w-3.5" />
          Roster
        </Button>
        <div className="pointer-events-auto ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name your play…"
            className="w-40 sm:w-52"
          />
          <Select
            value={String(rotation)}
            disabled={step === 'play'}
            onChange={(event) => setRotation(Number(event.target.value))}
            className="w-28"
          >
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                Rotation {value}
              </option>
            ))}
          </Select>
          <Select
            value={formation}
            disabled={step === 'play'}
            title={
              formation === 'custom'
                ? 'Your saved custom formation'
                : FORMATION_INFO[formation].description
            }
            onChange={(event) => setFormation(event.target.value as QuickFormation)}
            className="w-24"
          >
            {FORMATIONS.map((value) => (
              <option key={value} value={value} title={FORMATION_INFO[value].description}>
                {value}
              </option>
            ))}
            {hasCustom && <option value="custom">Custom</option>}
          </Select>
          <Button
            variant={libero ? 'primary' : 'default'}
            disabled={step === 'play'}
            onClick={() => setLibero(!libero)}
            title="Toggle the libero in the lineup"
          >
            Libero
          </Button>
        </div>
      </header>

      <QuickRoster />
      <QuickCameraControls />
      <QuickHUD />
      <OrientationNotice />
    </div>
  );
}
