import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MousePointerClick, Users } from 'lucide-react';
import { Button, Select, TextInput } from '../../components/ui';
import { useEditorStore } from '../../stores/editorStore';
import { useQuickStore } from '../../stores/quickStore';
import { Scene } from '../court/Scene';
import { QuickHUD } from './QuickHUD';
import { QuickRoster } from './QuickRoster';

export function QuickPlayPage() {
  const name = useQuickStore((state) => state.name);
  const rotation = useQuickStore((state) => state.rotation);
  const step = useQuickStore((state) => state.step);
  const rosterOpen = useQuickStore((state) => state.rosterOpen);
  const setName = useQuickStore((state) => state.setName);
  const setRotation = useQuickStore((state) => state.setRotation);
  const toggleRoster = useQuickStore((state) => state.toggleRoster);

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
      const amount = event.shiftKey ? 1 : 0.25;
      const dx = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
      const dz = event.key === 'ArrowLeft' ? amount : event.key === 'ArrowRight' ? -amount : 0;
      event.preventDefault();
      quick.nudgeSelected(dx, dz);
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
        <div className="panel pointer-events-auto flex items-center gap-2 px-3 py-1.5">
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
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Play name"
            className="w-52"
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
        </div>
      </header>

      <QuickRoster />
      <QuickHUD />
    </div>
  );
}
