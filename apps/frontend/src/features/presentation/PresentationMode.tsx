import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, X } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { useAuthStore } from '../../stores/authStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Scene } from '../court/Scene';
import { ChapterBar } from './ChapterBar';
import { PlaybackControls } from './PlaybackControls';

/**
 * Full-screen teaching mode for the gym. Route: /present/:playId
 * Tap a chapter to jump, swipe left/right to move between chapters.
 */
export function PresentationMode() {
  const { playId } = useParams<{ playId: string }>();
  const token = useAuthStore((state) => state.token);
  const play = usePlayStore((state) => state.play);
  const phases = usePlayStore((state) => state.phases);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const publicQuery = trpc.play.getPublic.useQuery(
    { id: playId ?? '' },
    { enabled: Boolean(playId), retry: 0, refetchOnWindowFocus: false },
  );
  const authedQuery = trpc.play.get.useQuery(
    { id: playId ?? '' },
    { enabled: Boolean(playId && token) && publicQuery.isError, retry: 0 },
  );
  const detail = publicQuery.data ?? authedQuery.data;

  useEffect(() => {
    if (detail) {
      usePlayStore.getState().reset();
      usePlayStore.getState().loadDetail(detail);
      useTimelineStore.getState().reset();
    }
  }, [detail]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setChromeVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, [chromeVisible]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement
        .requestFullscreen()
        .catch((error) => console.error('Fullscreen unavailable', error));
  };

  const jumpChapter = (direction: 1 | -1) => {
    const currentMs = useTimelineStore.getState().currentMs;
    const index = phases.findIndex((phase) => currentMs >= phase.startMs && currentMs < phase.endMs);
    const next = phases[index === -1 ? 0 : index + direction];
    if (next) {
      useTimelineStore.getState().setPlaying(false);
      useTimelineStore.getState().setCurrent(next.startMs);
    }
  };

  if (!detail || !play) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {publicQuery.isLoading || authedQuery.isLoading || detail
          ? 'Loading play…'
          : 'Play not available'}
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-panel-950"
      onPointerMove={() => setChromeVisible(true)}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const touch = event.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
          jumpChapter(dx < 0 ? 1 : -1);
        }
      }}
    >
      <Scene editing={false} />

      {chromeVisible && (
        <>
          <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent p-3">
            <Link to="/" className="btn btn-icon" title="Exit presentation">
              <X className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-white">{play.name}</h1>
              <p className="text-[10px] text-white/60">Swipe to change chapters · tap the bar to seek</p>
            </div>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                className="btn btn-icon"
                title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
              <Link to={`/play/${play.id}`} className="btn">
                <ArrowLeft className="h-3.5 w-3.5" />
                Editor
              </Link>
            </div>
          </header>

          <footer className="absolute inset-x-0 bottom-0 z-20 space-y-2 bg-gradient-to-t from-black/85 to-transparent p-3 pb-4">
            <ChapterBar phases={phases} compact />
            <div className="mx-auto max-w-3xl">
              <PlaybackControls />
            </div>
          </footer>
        </>
      )}

      {!isFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs text-white/90 backdrop-blur"
        >
          Tap for full screen
        </button>
      )}
    </div>
  );
}
