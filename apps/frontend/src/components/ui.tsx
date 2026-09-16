import { useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../lib/cn';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

export function Button({
  variant = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'danger' && 'btn-danger',
        variant === 'ghost' && 'btn-ghost',
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  variant = 'ghost',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <Button variant={variant} className={cn('btn-icon', className)} {...props} />;
}

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('panel', className)}>
      {(title || actions) && (
        <header className="panel-header">
          {title ? <h2 className="text-xs font-semibold text-slate-200">{title}</h2> : <span />}
          {actions}
        </header>
      )}
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input', className)} {...props} />;
}

/** Password field with a show/hide toggle. */
export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={cn('input pr-9', className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input min-h-[64px] resize-y', className)} {...props} />;
}

export function NumberInput({
  step = 0.1,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" step={step} className={cn('input tabular-nums', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('input cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex rounded-lg border border-white/10 bg-panel-950/70 p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition',
            value === option.value
              ? 'bg-sky-500/25 text-sky-100'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-xs text-slate-300 hover:bg-white/5"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-4 w-7 shrink-0 rounded-full transition',
          checked ? 'bg-sky-500/70' : 'bg-slate-600/60',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
            checked ? 'left-3.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={cn(
          'panel flex max-h-[90vh] w-full flex-col',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-3xl',
        )}
      >
        <header className="panel-header">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <IconButton onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-white/5 p-3">{footer}</footer>}
      </div>
    </div>
  );
}
