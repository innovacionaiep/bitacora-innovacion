'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getVitrinaAiSettings,
  saveVitrinaAiSettings,
  testVitrinaOpenRouter,
} from '@/lib/actions/vitrina-ai';
import { VITRINA_AI_DEFAULT_MODEL } from '@/lib/vitrina-ai-settings';
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
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setInfo('');
    setApiKey('');
    setLoading(true);
    void getVitrinaAiSettings().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success || !result.data) {
        setError(result.error ?? 'No se pudo leer la configuración');
        return;
      }
      setConfigured(result.data.configured);
      setKeyMasked(result.data.keyMasked);
      setModel(result.data.model || VITRINA_AI_DEFAULT_MODEL);
    });
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

  const busy = loading || saving || testing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asistente I.A. de la vitrina</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                Deja el campo vacío para conservar la key actual, o pega una nueva
                para reemplazarla.
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
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
