import { THEMES, THEME_INFO } from '../lib/theme';
import { cn } from '../lib/cn';
import { useThemeStore } from '../stores/themeStore';

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-panel-950/70 p-0.5">
      {THEMES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          title={`${THEME_INFO[id].label} — ${THEME_INFO[id].description}`}
          className={cn(
            'flex h-6 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition',
            theme === id ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-200',
          )}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-white/25"
            style={{ background: THEME_INFO[id].swatch }}
          />
          {!compact && THEME_INFO[id].label}
        </button>
      ))}
    </div>
  );
}
