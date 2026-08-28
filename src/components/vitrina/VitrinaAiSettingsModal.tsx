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
  getPortalSessionRoleSettings,
  savePortalGuestSettings,
  savePortalSessionRoleSettings,
} from '@/lib/actions/portal-guest';
import {
  getImpulsaExcelSettings,
  saveImpulsaExcelSettings,
  testImpulsaExcelFile,
  testImpulsaExcelSheet,
  updateImpulsaExcelSnapshot,
} from '@/lib/actions/portal-avances-impulsa';
import { VITRINA_AI_DEFAULT_MODEL } from '@/lib/vitrina-ai-settings';
import {
  DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
  PORTAL_GUEST_LEVELS,
  PORTAL_SESSION_ROLES,
  portalLevelCaption,
  portalSessionLevelCaption,
  type PortalGuestLevel,
  type PortalSessionRoleLevels,
} from '@/lib/portal-guest-access';
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
  0: 'Causalab — solo Avances / Fondo Impulsa',
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
    0: false,
    1: false,
    2: false,
    3: false,
  });
  const [guestCodes, setGuestCodes] = useState({
    0: '',
    1: '',
    2: '',
    3: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCodes, setSavingCodes] = useState(false);
  const [testing, setTesting] = useState(false);
  const [impulsaPath, setImpulsaPath] = useState('');
  const [impulsaSheet, setImpulsaSheet] = useState('IMPULSA');
  const [impulsaFileOk, setImpulsaFileOk] = useState(false);
  const [impulsaSheetOk, setImpulsaSheetOk] = useState(false);
  const [impulsaSyncedAt, setImpulsaSyncedAt] = useState<string | null>(null);
  const [impulsaRowCount, setImpulsaRowCount] = useState(0);
  const [testingFile, setTestingFile] = useState(false);
  const [testingSheet, setTestingSheet] = useState(false);
  const [updatingImpulsa, setUpdatingImpulsa] = useState(false);
  const [savingImpulsa, setSavingImpulsa] = useState(false);
  const [roleLevels, setRoleLevels] = useState<PortalSessionRoleLevels>(
    DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
  );
  const [savingRoles, setSavingRoles] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setInfo('');
    setApiKey('');
    setGuestCodes({ 0: '', 1: '', 2: '', 3: '' });
    setLoading(true);
    void Promise.all([
      getVitrinaAiSettings(),
      getPortalGuestSettings(),
      getImpulsaExcelSettings(),
      getPortalSessionRoleSettings(),
    ]).then(([aiResult, guestResult, impulsaResult, roleResult]) => {
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
        if (impulsaResult.success && impulsaResult.data) {
          setImpulsaPath(impulsaResult.data.filePath);
          setImpulsaSheet(impulsaResult.data.sheetName);
          setImpulsaFileOk(impulsaResult.data.fileOk);
          setImpulsaSheetOk(impulsaResult.data.sheetOk);
          setImpulsaSyncedAt(impulsaResult.data.lastSyncedAt);
          setImpulsaRowCount(impulsaResult.data.rowCount);
        }
        if (roleResult.success && roleResult.data) {
          setRoleLevels(roleResult.data);
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
    setGuestCodes({ 0: '', 1: '', 2: '', 3: '' });
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

  async function persistImpulsaConfig() {
    const result = await saveImpulsaExcelSettings({
      filePath: impulsaPath,
      sheetName: impulsaSheet,
    });
    if (!result.success || !result.data) {
      return { ok: false as const, error: result.error ?? 'No se pudo guardar la ruta' };
    }
    setImpulsaFileOk(result.data.fileOk);
    setImpulsaSheetOk(result.data.sheetOk);
    setImpulsaSyncedAt(result.data.lastSyncedAt);
    setImpulsaRowCount(result.data.rowCount);
    return { ok: true as const };
  }

  async function handleSaveImpulsa() {
    setError('');
    setInfo('');
    setSavingImpulsa(true);
    const saved = await persistImpulsaConfig();
    setSavingImpulsa(false);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    setInfo('Ruta y hoja de Impulsa guardadas.');
  }

  async function handleTestImpulsaFile() {
    setError('');
    setInfo('');
    setTestingFile(true);
    const saved = await persistImpulsaConfig();
    if (!saved.ok) {
      setTestingFile(false);
      setError(saved.error);
      return;
    }
    const result = await testImpulsaExcelFile();
    setTestingFile(false);
    if (!result.success) {
      setImpulsaFileOk(false);
      setImpulsaSheetOk(false);
      setError(result.error ?? 'No se pudo abrir el archivo');
      return;
    }
    setImpulsaFileOk(true);
    setInfo('Archivo Excel encontrado y se abre correctamente.');
  }

  async function handleTestImpulsaSheet() {
    setError('');
    setInfo('');
    setTestingSheet(true);
    const saved = await persistImpulsaConfig();
    if (!saved.ok) {
      setTestingSheet(false);
      setError(saved.error);
      return;
    }
    const result = await testImpulsaExcelSheet();
    setTestingSheet(false);
    if (!result.success) {
      setImpulsaSheetOk(false);
      setError(result.error ?? 'No se pudo leer la hoja');
      return;
    }
    setImpulsaFileOk(true);
    setImpulsaSheetOk(true);
    setInfo(`Hoja "${impulsaSheet.trim() || 'IMPULSA'}" encontrada y las columnas coinciden.`);
  }

  async function handleUpdateImpulsa() {
    setError('');
    setInfo('');
    setUpdatingImpulsa(true);
    const saved = await persistImpulsaConfig();
    if (!saved.ok) {
      setUpdatingImpulsa(false);
      setError(saved.error);
      return;
    }
    const result = await updateImpulsaExcelSnapshot();
    setUpdatingImpulsa(false);
    if (!result.success || !result.data) {
      setError(result.error ?? 'No se pudo actualizar');
      return;
    }
    setImpulsaFileOk(result.data.fileOk);
    setImpulsaSheetOk(result.data.sheetOk);
    setImpulsaSyncedAt(result.data.lastSyncedAt);
    setImpulsaRowCount(result.data.rowCount);
    setInfo(
      `Actualizado: ${result.data.rowCount} proyecto${result.data.rowCount === 1 ? '' : 's'} de Fondo Impulsa.`,
    );
    router.refresh();
  }

  async function handleSaveRoles() {
    setError('');
    setInfo('');
    setSavingRoles(true);
    const result = await savePortalSessionRoleSettings({ levels: roleLevels });
    setSavingRoles(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudieron guardar los accesos por rol');
      return;
    }
    setInfo('Acceso del portal por rol actualizado.');
    router.refresh();
  }

  const busy =
    loading ||
    saving ||
    savingCodes ||
    testing ||
    savingImpulsa ||
    testingFile ||
    testingSheet ||
    updatingImpulsa ||
    savingRoles;
  const hasTypedCode = PORTAL_GUEST_LEVELS.some(
    (level) => guestCodes[level].trim(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[min(96rem,calc(100vw-2rem))] max-w-[min(96rem,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del portal</DialogTitle>
        </DialogHeader>
        <div className="grid items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
          <section
            aria-labelledby="portal-settings-ai"
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <h3
                id="portal-settings-ai"
                className="text-sm font-semibold text-slate-900"
              >
                Asistente I.A.
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Conexión de OpenRouter para el chat del portal.
              </p>
            </div>
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
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
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
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleSave(false)}
                disabled={busy || (!configured && !apiKey.trim())}
              >
                {saving ? 'Guardando…' : 'Guardar I.A.'}
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="portal-settings-guest"
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <h3
                id="portal-settings-guest"
                className="text-sm font-semibold text-slate-900"
              >
                Códigos de invitado
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Un código por nivel de acceso al portal.
              </p>
            </div>
            {PORTAL_GUEST_LEVELS.map((level) => (
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
            <div className="mt-auto pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveCodes()}
                disabled={busy || !hasTypedCode}
              >
                {savingCodes ? 'Guardando códigos…' : 'Guardar códigos'}
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="portal-settings-impulsa"
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <h3
                id="portal-settings-impulsa"
                className="text-sm font-semibold text-slate-900"
              >
                Fondo Impulsa (Excel local)
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Actualizar solo desde este equipo con OneDrive sincronizado. El
                portal publicado muestra el último snapshot, no lee el archivo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="impulsa-excel-path">Ruta del archivo .xlsx</Label>
              <Input
                id="impulsa-excel-path"
                value={impulsaPath}
                onChange={(e) => {
                  setImpulsaPath(e.target.value);
                  setImpulsaFileOk(false);
                  setImpulsaSheetOk(false);
                }}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="impulsa-excel-sheet">Hoja</Label>
              <Input
                id="impulsa-excel-sheet"
                value={impulsaSheet}
                onChange={(e) => {
                  setImpulsaSheet(e.target.value);
                  setImpulsaSheetOk(false);
                }}
                disabled={busy}
              />
            </div>
            {impulsaSyncedAt ? (
              <p className="text-xs text-slate-500">
                Última actualización:{' '}
                {new Date(impulsaSyncedAt).toLocaleString('es-CL')} (
                {impulsaRowCount} filas)
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Aún no hay snapshot de Impulsa.
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveImpulsa()}
                disabled={busy}
              >
                {savingImpulsa ? 'Guardando…' : 'Guardar ruta'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleTestImpulsaFile()}
                disabled={busy}
              >
                {testingFile ? 'Probando…' : 'Probar archivo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleTestImpulsaSheet()}
                disabled={busy}
              >
                {testingSheet ? 'Probando…' : 'Probar hoja'}
              </Button>
              {impulsaFileOk && impulsaSheetOk ? (
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => void handleUpdateImpulsa()}
                  disabled={busy}
                >
                  {updatingImpulsa ? 'Actualizando…' : 'Actualizar'}
                </Button>
              ) : null}
            </div>
          </section>
        </div>
        <section
          aria-labelledby="portal-settings-roles"
          className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="mb-4">
            <h3
              id="portal-settings-roles"
              className="text-sm font-semibold text-slate-900"
            >
              Cuentas logueadas por rol
            </h3>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              Define qué ve cada rol en el portal. El nivel 0 redirige a Inicio
              en la app al pulsar «Ver proyectos en curso». Si una cuenta tiene
              varios roles, se aplica el nivel más alto.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Rol</th>
                  <th className="py-2 pr-3 font-medium">Nivel</th>
                  <th className="py-2 font-medium">Qué ve</th>
                </tr>
              </thead>
              <tbody>
                {PORTAL_SESSION_ROLES.map((role) => (
                  <tr key={role} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      <Label htmlFor={`portal-role-level-${role}`}>{role}</Label>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        id={`portal-role-level-${role}`}
                        className="h-9 w-full min-w-[11rem] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                        value={roleLevels[role]}
                        disabled={busy}
                        onChange={(e) => {
                          const next = Number(e.target.value) as PortalGuestLevel;
                          setRoleLevels((current) => ({
                            ...current,
                            [role]: next,
                          }));
                        }}
                      >
                        {PORTAL_GUEST_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level === 0
                              ? '0 — Redirigir a la app'
                              : `${level} — ${portalLevelCaption(level)}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-xs leading-snug text-slate-500">
                      {portalSessionLevelCaption(roleLevels[role])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveRoles()}
              disabled={busy}
            >
              {savingRoles ? 'Guardando…' : 'Guardar accesos por rol'}
            </Button>
          </div>
        </section>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
