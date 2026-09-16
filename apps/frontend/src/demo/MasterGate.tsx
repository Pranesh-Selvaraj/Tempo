import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button, Field, PasswordInput, TextInput } from '../components/ui';
import { BRAND_ICON } from '../lib/brand';
import { MASTER_USER, verifyMasterCredentials } from '../lib/master';
import { useMasterStore } from './masterStore';

/**
 * Master credential screen for the static preview. Rendered instead of the app
 * until the correct username and password are entered.
 */
export function MasterGate() {
  const unlock = useMasterStore((state) => state.unlock);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const ok = await verifyMasterCredentials(username, password);
    if (ok) {
      unlock();
    } else {
      setError('Incorrect username or password');
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-panel-950 p-6 text-slate-100">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      <form onSubmit={submit} className="panel relative w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-3">
          <img src={BRAND_ICON} alt="Tempo" className="h-11 w-11 rounded-xl" />
          <div>
            <h1 className="text-base font-bold text-slate-100">Tempo</h1>
            <p className="text-[11px] text-slate-500">
              Private preview · authorized access only
            </p>
          </div>
        </div>

        <Field label="Username">
          <TextInput
            value={username}
            autoFocus
            autoComplete="username"
            placeholder={MASTER_USER === 'master' ? 'master' : undefined}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={busy || !username || !password}
        >
          <Lock className="h-3.5 w-3.5" />
          {busy ? 'Checking…' : 'Unlock'}
        </Button>

        <p className="text-center text-[10px] text-slate-600">
          This preview keeps everything in this browser. Nothing is uploaded.
        </p>
      </form>
    </div>
  );
}
