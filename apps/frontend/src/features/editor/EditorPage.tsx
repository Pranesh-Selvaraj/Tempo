import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Scene } from '../court/Scene';
import { ExportDialog } from '../recording/ExportDialog';
import { RenderQueueBadge } from '../recording/RenderQueueBadge';
import { useRenderQueueProcessor } from '../recording/useRenderQueue';
import { Timeline } from '../timeline/Timeline';
import { TimelineSync } from '../timeline/TimelineSync';
import { useRecordKeyframe } from '../timeline/useRecordKeyframe';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { TopBar } from './TopBar';
import { useDeleteSelection } from './useEditorActions';

export function EditorPage() {
  const { playId } = useParams<{ playId: string }>();
  const [searchParams] = useSearchParams();
  const [exportOpen, setExportOpen] = useState(searchParams.get('record') === '1');
  const play = usePlayStore((state) => state.play);
  const loadDetail = usePlayStore((state) => state.loadDetail);
  const reset = usePlayStore((state) => state.reset);
  const recordingFrame = useEditorStore((state) => state.recordingFrame);
  const recording = recordingFrame.active;
  const recordKeyframe = useRecordKeyframe();
  const deleteSelection = useDeleteSelection();
  useRenderQueueProcessor();

  const query = trpc.play.get.useQuery(
    { id: playId ?? '' },
    { enabled: Boolean(playId), retry: 1 },
  );

  useEffect(() => {
    if (query.data) {
      reset();
      loadDetail(query.data);
      useTimelineStore.getState().reset();
    }
  }, [query.data, loadDetail, reset]);

  useEffect(() => {
    if (play) document.title = `${play.name} — Tempo`;
    return () => {
      document.title = 'Tempo — 3D Volleyball Play Designer';
    };
  }, [play]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const timeline = useTimelineStore.getState();
      const duration = usePlayStore.getState().durationMs;
      switch (event.key) {
        case ' ':
          event.preventDefault();
          timeline.toggle();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          timeline.stepFrames(event.shiftKey ? -10 : -1, duration);
          break;
        case 'ArrowRight':
          event.preventDefault();
          timeline.stepFrames(event.shiftKey ? 10 : 1, duration);
          break;
        case 'k':
        case 'K':
          recordKeyframe();
          break;
        case 'Escape': {
          const editor = useEditorStore.getState();
          editor.clearDraft();
          editor.setTool('select');
          editor.clearSelection();
          break;
        }
        case 'Delete':
        case 'Backspace':
          deleteSelection();
          break;
        default:
          break;
      }
    },
    [deleteSelection, recordKeyframe],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (query.isLoading || (query.data && (!play || play.id !== query.data.play.id))) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading play…
      </div>
    );
  }

  if (query.error || !play) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
        <p className="text-base font-medium text-slate-200">Play not found</p>
        <p>{query.error?.message ?? 'It may have been deleted.'}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', recording && 'bg-black')}>
      <TimelineSync />
      <RenderQueueBadge />
      {!recording && <TopBar onExport={() => setExportOpen(true)} />}

      <div className="flex min-h-0 flex-1">
        {!recording && <LeftPanel />}
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-panel-950">
          <div
            className="relative h-full"
            style={
              recording
                ? { aspectRatio: `${recordingFrame.width} / ${recordingFrame.height}`, maxWidth: '100%' }
                : undefined
            }
          >
            <Scene editing={!recording} />
            {recording && (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-red-400/30 bg-black/70 px-3 py-1 text-[11px] text-red-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Recording {recordingFrame.width}×{recordingFrame.height}
              </div>
            )}
          </div>
        </main>
        {!recording && <RightPanel />}
      </div>

      {!recording && <div className="h-44 shrink-0"><Timeline /></div>}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
