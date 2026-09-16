import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Pencil, Presentation } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { useAuthStore } from '../../stores/authStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Scene } from '../court/Scene';
import { ChapterBar } from './ChapterBar';
import { PlaybackControls } from './PlaybackControls';

/**
 * Read-only share page (/view/:id). Works without an account when the play is
 * public — this is the link coaches send to the team group.
 */
export function ViewerPage() {
  const { playId } = useParams<{ playId: string }>();
  const token = useAuthStore((state) => state.token);
  const play = usePlayStore((state) => state.play);
  const phases = usePlayStore((state) => state.phases);

  const publicQuery = trpc.play.getPublic.useQuery(
    { id: playId ?? '' },
    { enabled: Boolean(playId), retry: 0, refetchOnWindowFocus: false },
  );
  const authedNeeded = Boolean(playId && token) && publicQuery.isError;
  const authedQuery = trpc.play.get.useQuery(
    { id: playId ?? '' },
    { enabled: authedNeeded, retry: 0 },
  );
  const detail = publicQuery.data ?? authedQuery.data;

  useEffect(() => {
    if (detail) {
      usePlayStore.getState().reset();
      usePlayStore.getState().loadDetail(detail);
      useTimelineStore.getState().reset();
    }
  }, [detail]);

  if (
    publicQuery.isLoading ||
    (authedNeeded && authedQuery.isLoading) ||
    (detail && (!play || play.id !== detail.play.id))
  ) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading play…
      </div>
    );
  }

  if (!detail || !play) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base font-semibold text-slate-100">This play is not available</p>
        <p className="max-w-sm text-xs text-slate-400">
          The link may be wrong, or the coach has not turned on public sharing for this play yet.
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tempo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-panel-950">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/5 bg-panel-900/80 px-3">
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-100">{play.name}</h1>
          <p className="text-[10px] text-slate-500">
            {play.courtType === 'beach' ? 'Beach' : 'Indoor'} · Rotation {play.rotation} · net{' '}
            {play.netHeight.toFixed(2)} m
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <Link to="/rules" className="btn">
            <BookOpen className="h-3.5 w-3.5" />
            Rules
          </Link>
          <Link to={`/present/${play.id}`} className="btn">
            <Presentation className="h-3.5 w-3.5" />
            Present
          </Link>
          {token && (
            <Link to={`/play/${play.id}`} className="btn btn-primary">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Scene editing={false} />
      </div>

      <footer className="shrink-0 space-y-2 border-t border-white/5 bg-panel-900/80 p-3">
        <ChapterBar phases={phases} />
        <PlaybackControls />
      </footer>
    </div>
  );
}
