'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { redeemPortalGuestCode } from '@/lib/actions/portal-guest';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGIN_HREF = `/auth/login?callbackUrl=${encodeURIComponent('/?vista=proyectos')}`;

export function VitrinaGuestGate({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const result = await redeemPortalGuestCode(code);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Código inválido');
      return;
    }
    setOpen(false);
    router.replace('/?vista=proyectos');
    router.refresh();
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      <div className="absolute left-0 top-0 z-10 px-5 pt-8 sm:px-8 sm:pt-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <Link
          href={LOGIN_HREF}
          className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
        >
          Iniciar sesión
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError('');
          }}
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Ingresar con código de invitado
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código de invitado</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleRedeem(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="portal-guest-code">Código</Label>
              <Input
                id="portal-guest-code"
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={saving}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={saving || !code.trim()}
              >
                {saving ? 'Validando…' : 'Ingresar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
