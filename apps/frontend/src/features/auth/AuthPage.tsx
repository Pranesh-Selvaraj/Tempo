import { useState, type FormEvent } from 'react';
import { Loader2, Volleyball } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { useAuthStore } from '../../stores/authStore';
import { Button, Field, Panel, PasswordInput, TextInput } from '../../components/ui';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const pending = login.isLoading || register.isLoading;
  const error = login.error ?? register.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'login') {
      login.mutate(
        { email, password },
        { onSuccess: (data) => setAuth(data.token, data.user) },
      );
    } else {
      register.mutate(
        { email, password, name },
        { onSuccess: (data) => setAuth(data.token, data.user) },
      );
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#070b14_60%)] p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
            <Volleyball className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold">Tempo</h1>
          <p className="text-xs text-slate-400">
            Author 3D volleyball plays, record them, teach them anywhere.
          </p>
        </div>

        <Panel>
          <form className="space-y-3" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-panel-950/70 p-0.5">
              {(['login', 'register'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={
                    mode === option
                      ? 'rounded-md bg-sky-500/25 px-2 py-1 text-xs font-medium text-sky-100'
                      : 'rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200'
                  }
                >
                  {option === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {mode === 'register' && (
              <Field label="Your name">
                <TextInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Coach Alex"
                  required
                  minLength={1}
                />
              </Field>
            )}
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="coach@team.com"
                required
              />
            </Field>
            <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
                {error.message}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full py-2" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </Panel>

        <p className="text-center text-[10px] text-slate-600">
          Self-hosted · your plays stay on your server
        </p>
      </div>
    </div>
  );
}
