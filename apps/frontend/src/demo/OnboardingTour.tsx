import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../components/ui';
import { TOUR_DONE_KEY, useTourStore } from './tourStore';

interface TourStep {
  title: string;
  body: string;
  action?: { label: string; route: string };
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Tempo',
    body:
      'Tempo is a 3D volleyball play designer. You build plays on a real court, choreograph the ball and camera, then teach them from any device. Everything you make in this preview is saved in this browser only.',
  },
  {
    title: 'Your play library',
    body:
      'Every play lives here. Use the search and category filters to find one, duplicate or delete it, and turn on sharing when you want to send a read-only link to a player.',
  },
  {
    title: 'Start on the court — interactive play',
    body:
      'No setup needed: tap where the serve lands, where the pass goes, where the set goes, then where the spike lands. Tempo builds the ball path, player runs and keyframes for you — and you can save the result as a normal play.',
    action: { label: 'Open interactive play', route: '/interactive' },
  },
  {
    title: 'Fine-tune in the editor',
    body:
      'Open any play to edit the details: drag players into position, draw ball paths, record keyframes (press K), add coaching phases, net-side annotations and cinematic camera paths on the timeline.',
  },
  {
    title: 'Teach it',
    body:
      'Presentation mode turns any play into a full-screen chapter-by-chapter walkthrough with slow motion and ghost trails. Viewer links let players replay the play on their phones without an account.',
  },
  {
    title: 'Record and share',
    body:
      'Export a play as MP4, GIF or a 3D model straight from the browser — nothing is uploaded in this preview. Download it or use your device share sheet to send it to the team.',
  },
  {
    title: 'Run the match',
    body:
      'The scorecard tracks live scoring, rotations, timeouts, substitutions and per-player stats, then exports a printable match report.',
    action: { label: 'Open scorecard', route: '/scorecard' },
  },
  {
    title: 'Rules, always at hand',
    body:
      'The built-in rules reference covers scoring, rotations, contacts, faults, the net, serving and the libero — with diagrams from the official rule book.',
    action: { label: 'Open rules', route: '/rules' },
  },
  {
    title: "You're set",
    body:
      'Create your first play from the library, or jump straight into interactive play. You can replay this tour any time from the question-mark button in the library header.',
  },
];

/** First-run guidance for the static preview. Replayable from the library. */
export function OnboardingTour() {
  const open = useTourStore((state) => state.open);
  const start = useTourStore((state) => state.start);
  const close = useTourStore((state) => state.close);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_DONE_KEY)) start();
    } catch {
      /* storage unavailable — skip the automatic tour */
    }
  }, [start]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!open) return null;

  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(TOUR_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    close();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-lg space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="chip">
            Step {index + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            aria-label="Close tour"
            className="text-slate-500 transition hover:text-slate-200"
            onClick={finish}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-100">{step.title}</h2>
          <p className="text-xs leading-relaxed text-slate-400">{step.body}</p>
        </div>

        {step.action && (
          <Button onClick={() => navigate(step.action!.route)}>{step.action.label}</Button>
        )}

        <div className="flex items-center gap-1">
          {STEPS.map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={
                dotIndex === index
                  ? 'h-1.5 w-5 rounded-full bg-sky-400'
                  : 'h-1.5 w-1.5 rounded-full bg-slate-700'
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={finish}>
            Skip tour
          </Button>
          <div className="flex gap-1">
            {index > 0 && (
              <Button onClick={() => setIndex(index - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {last ? (
              <Button variant="primary" onClick={finish}>
                Start creating
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIndex(index + 1)}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
