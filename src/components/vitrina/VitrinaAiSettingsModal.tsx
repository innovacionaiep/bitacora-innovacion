'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getVitrinaAiSettings,
  saveVitrinaAiSettings,
  testVitrinaOpenRouter,
} from '@/lib/actions/vitrina-ai';
import {
  getPortalGuestSettings,
  savePortalGuestSettings,
} from '@/lib/actions/portal-guest';
import { VITRINA_AI_DEFAULT_MODEL } from '@/lib/vitrina-ai-settings';
import type { PortalGuestLevel } from '@/lib/portal-guest-access';
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

const MODEL_SUGGESTIONS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'google/gemini-2.5-flash',
  'anthropic/claude-sonnet-4',
];

const LEVEL_HINT: Record<PortalGuestLevel, string> = {
  1: 'Tarjetas, filtros y chat IA',
  2: 'Nivel 1 + Indicadores y Avances',
  3: 'Toda la información de lectura',
};

export function VitrinaAiSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(VITRINA_AI_DEFAULT_MODEL);
  const [keyMasked, setKeyMasked] = useState('');
  const [configured, setConfigured] = useState(false);
  const [guestConfigured, setGuestConfigured] = useState({
    1: false,
    2: false,
    3: false,
  });
  const [guestCodes, setGuestCodes] = useState({ 1: '', 2: '', 3: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCodes, setSavingCodes] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setInfo('');
    setApiKey('');
    setGuestCodes({ 1: '', 2: '', 3: '' });
    setLoading(true);
    void Promise.all([getVitrinaAiSettings(), getPortalGuestSettings()]).then(
      ([aiResult, guestResult]) => {
        if (cancelled) return;
        setLoading(false);
        if (!aiResult.success || !aiResult.data) {
          setError(aiResult.error ?? 'No se pudo leer la configuración');
          return;
        }
        setConfigured(aiResult.data.configured);
        setKeyMasked(aiResult.data.keyMasked);
        setModel(aiResult.data.model || VITRINA_AI_DEFAULT_MODEL);
        if (guestResult.success && guestResult.data) {
          setGuestConfigured(guestResult.data);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSave(clearKey = false) {
    setError('');
    setInfo('');
    setSaving(true);
    const result = await saveVitrinaAiSettings({
      apiKey: clearKey ? '' : apiKey,
      model,
      clearKey,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar');
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  async function handleSaveCodes() {
    setError('');
    setInfo('');
    setSavingCodes(true);
    const result = await savePortalGuestSettings({
      codes: guestCodes,
    });
    setSavingCodes(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudieron guardar los códigos');
      return;
    }
    setGuestCodes({ 1: '', 2: '', 3: '' });
    const next = await getPortalGuestSettings();
    if (next.success && next.data) setGuestConfigured(next.data);
    setInfo('Códigos de invitado actualizados.');
  }

  async function handleClearCode(level: PortalGuestLevel) {
    setError('');
    setInfo('');
    setSavingCodes(true);
    const result = await savePortalGuestSettings({
      codes: {},
      clear: { [level]: true },
    });
    setSavingCodes(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo quitar el código');
      return;
    }
    const next = await getPortalGuestSettings();
    if (next.success && next.data) setGuestConfigured(next.data);
    setInfo(`Código de nivel ${level} eliminado.`);
  }

  async function handleTest() {
    setError('');
    setInfo('');
    setTesting(true);
    const result = await testVitrinaOpenRouter(apiKey);
    setTesting(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo probar la conexión');
      return;
    }
    setInfo('OpenRouter aceptó la API key.');
  }

  const busy = loading || saving || savingCodes || testing;
  const hasTypedCode = Boolean(
    guestCodes[1].trim() || guestCodes[2].trim() || guestCodes[3].trim(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración del portal</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-900">Asistente I.A.</p>
            <div className="space-y-1.5">
              <Label htmlFor="vitrina-openrouter-key">API key de OpenRouter</Label>
              <Input
                id="vitrina-openrouter-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  configured && keyMasked
                    ? `Configurada (${keyMasked})`
                    : 'sk-or-v1-…'
                }
                disabled={busy}
              />
              {configured && !apiKey ? (
                <p className="text-xs text-slate-500">
                  Deja el campo vacío para conservar la key actual, o pega una
                  nueva para reemplazarla.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vitrina-openrouter-model">Modelo</Label>
              <Input
                id="vitrina-openrouter-model"
                list="vitrina-openrouter-models"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={VITRINA_AI_DEFAULT_MODEL}
                disabled={busy}
              />
              <datalist id="vitrina-openrouter-models">
                {MODEL_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-900">
              Códigos de invitado
            </p>
            {([1, 2, 3] as const).map((level) => (
              <div key={level} className="space-y-1.5">
                <Label htmlFor={`portal-guest-level-${level}`}>
                  Nivel {level} — {LEVEL_HINT[level]}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`portal-guest-level-${level}`}
                    type="password"
                    autoComplete="off"
                    value={guestCodes[level]}
                    onChange={(e) =>
                      setGuestCodes((current) => ({
                        ...current,
                        [level]: e.target.value,
                      }))
                    }
                    placeholder={
                      guestConfigured[level]
                        ? 'Configurado. Escribe uno nuevo para reemplazar'
                        : 'Sin configurar'
                    }
                    disabled={busy}
                  />
                  {guestConfigured[level] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 text-red-600 hover:text-red-700"
                      onClick={() => void handleClearCode(level)}
                      disabled={busy}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveCodes()}
              disabled={busy || !hasTypedCode}
            >
              {savingCodes ? 'Guardando códigos…' : 'Guardar códigos'}
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTest()}
              disabled={busy}
            >
              {testing ? 'Probando…' : 'Probar conexión'}
            </Button>
            {configured ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => void handleSave(true)}
                disabled={busy}
              >
                Quitar key
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void handleSave(false)}
              disabled={busy || (!configured && !apiKey.trim())}
            >
              {saving ? 'Guardando…' : 'Guardar I.A.'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
