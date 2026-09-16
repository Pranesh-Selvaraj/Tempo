import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Shared styling for items inside a Dropdown menu. */
export const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5 hover:text-slate-100';

/**
 * Small click-outside / Escape dismissible dropdown used for compact
 * navigation on phones and tablets.
 */
export function Dropdown({
  button,
  buttonClassName,
  align = 'right',
  label,
  children,
}: {
  button: ReactNode;
  buttonClassName?: string;
  align?: 'left' | 'right';
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={buttonClassName ?? 'btn btn-ghost'}
        onClick={() => setOpen((value) => !value)}
      >
        {button}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1.5 min-w-56 rounded-xl border border-white/10 bg-panel-900/95 p-1 shadow-xl backdrop-blur',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
