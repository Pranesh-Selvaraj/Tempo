import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '../../components/ui';

/** Full-screen nudge for phones held in portrait — the court is built for landscape. */
export function OrientationNotice() {
  const [portraitPhone, setPortraitPhone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      setPortraitPhone(coarse && portrait && window.innerWidth < 1024);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!portraitPhone || dismissed) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-panel-950/95 p-8 text-center">
      <RotateCw className="h-10 w-10 text-sky-300" />
      <p className="text-lg font-bold text-slate-100">Rotate your phone</p>
      <p className="max-w-xs text-sm text-slate-400">
        Interactive play is built for landscape screens — turn your phone sideways for the full
        court, roster and controls.
      </p>
      <Button variant="primary" onClick={() => setDismissed(true)}>
        Continue in portrait
      </Button>
    </div>
  );
}
