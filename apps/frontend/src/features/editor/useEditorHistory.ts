import { useCallback, useState } from 'react';
import { usePlayStore } from '../../stores/playStore';
import { useSaveStatusStore } from '../../stores/saveStatusStore';
import { reconcilePlay } from './reconcile';

export interface EditorHistoryControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
}

/**
 * Editor undo/redo. Snapshots restore the local play immediately, then the
 * server is reconciled in the background so a reload keeps the undone state.
 */
export function useEditorHistory(): EditorHistoryControls {
  const canUndo = usePlayStore((state) => state.past.length > 0);
  const canRedo = usePlayStore((state) => state.future.length > 0);
  const [busy, setBusy] = useState(false);

  const undo = useCallback(() => {
    const state = usePlayStore.getState();
    const target = state.past.at(-1);
    if (!target || !state.play) return;
    const current = state.captureSnapshot();
    usePlayStore.setState({
      past: state.past.slice(0, -1),
      future: [current, ...state.future].slice(0, 60),
      historyTag: null,
    });
    state.applySnapshot(target);

    const save = useSaveStatusStore.getState();
    save.begin('Undoing…');
    setBusy(true);
    reconcilePlay(state.play.id, target)
      .then(() => save.succeed('Change undone'))
      .catch((error) =>
        save.fail(error instanceof Error ? error.message : 'Could not undo the change'),
      )
      .finally(() => setBusy(false));
  }, []);

  const redo = useCallback(() => {
    const state = usePlayStore.getState();
    const target = state.future[0];
    if (!target || !state.play) return;
    const current = state.captureSnapshot();
    usePlayStore.setState({
      past: [...state.past.slice(-59), current],
      future: state.future.slice(1),
      historyTag: null,
    });
    state.applySnapshot(target);

    const save = useSaveStatusStore.getState();
    save.begin('Redoing…');
    setBusy(true);
    reconcilePlay(state.play.id, target)
      .then(() => save.succeed('Change restored'))
      .catch((error) =>
        save.fail(error instanceof Error ? error.message : 'Could not redo the change'),
      )
      .finally(() => setBusy(false));
  }, []);

  return { undo, redo, canUndo, canRedo, busy };
}
