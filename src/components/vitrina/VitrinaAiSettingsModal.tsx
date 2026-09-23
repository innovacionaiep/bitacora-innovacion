'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, FileSpreadsheet, KeyRound, Mail, Palette, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  updateImpulsaExcelSnapshot,
} from '@/lib/actions/portal-avances-impulsa';
import {
  getVcmExcelSettings,
  saveVcmExcelSettings,
  updateVcmExcelSnapshot,
} from '@/lib/actions/portal-avances-vcm';
import {
  getMoveLabExcelSettings,
  saveMoveLabExcelSettings,
  updateMoveLabExcelSnapshot,
} from '@/lib/actions/portal-avances-movelab';
import {
  getAceleradoraExcelSettings,
  saveAceleradoraExcelSettings,
  updateAceleradoraExcelSnapshot,
} from '@/lib/actions/portal-avances-aceleradora';
import {
  getPortalOutlookSettings,
  savePortalOutlookSettings,
  savePortalContactEmailTemplate,
  testPortalOutlook,
} from '@/lib/actions/portal-outlook';
import {
  getPortalFondoColors,
  savePortalFondoColors,
  type PortalFondoColorItem,
} from '@/lib/actions/portal-fondo-colors';
import { normalizeFondoColorHex } from '@/lib/vitrina-fondo-style';
import { VITRINA_AI_DEFAULT_MODEL } from '@/lib/vitrina-ai-settings';
import {
  PORTAL_OUTLOOK_DEFAULT_HOST,
  PORTAL_OUTLOOK_DEFAULT_PORT,
} from '@/lib/portal-outlook-settings';
import {
  applyPortalContactHtmlTemplate,
  PORTAL_CONTACT_EMAIL_SAMPLE,
  PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
} from '@/lib/portal-contact-template';
import {
  DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
  PORTAL_GUEST_LEVELS,
  PORTAL_GUEST_PROFILES,
  PORTAL_SESSION_ROLES,
  portalLevelCaption,
  portalProfileCaption,
  portalSessionLevelCaption,
  type PortalGuestLevel,
  type PortalGuestProfile,
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
import { PortalContactHtmlEditor } from '@/components/vitrina/PortalContactHtmlEditor';

const MODEL_SUGGESTIONS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'google/gemini-2.5-flash',
  'anthropic/claude-sonnet-4',
];

const LEVEL_HINT: Record<PortalGuestLevel, string> = {
  0: 'Avances e Indicadores',
  1: 'Tarjetas, filtros y chat IA',
  2: 'Nivel 1 + Indicadores y Avances',
  3: 'Toda la información de lectura',
};

const PROFILE_LABEL: Record<PortalGuestProfile, string> = {
  causalab: 'Causalab',
  vinculacion: 'Vinculación',
  visor: 'Visor',
  comunicaciones: 'Comunicaciones',
};

const EMPTY_GUEST_CODES = {
  0: '',
  1: '',
  2: '',
  3: '',
  causalab: '',
  vinculacion: '',
  visor: '',
  comunicaciones: '',
};

const EMPTY_GUEST_FLAGS = {
  0: false,
  1: false,
  2: false,
  3: false,
  causalab: false,
  vinculacion: false,
  visor: false,
  comunicaciones: false,
};

type PortalGuestCodeKey = PortalGuestLevel | PortalGuestProfile;

type PortalSettingsTab =
  | 'ai'
  | 'guest'
  | 'excel'
  | 'outlook'
  | 'roles'
  | 'fondos';

const SETTINGS_TABS: {
  id: PortalSettingsTab;
  label: string;
  icon: typeof Bot;
}[] = [
  { id: 'ai', label: 'Asistente I.A.', icon: Bot },
  { id: 'guest', label: 'Códigos de invitado', icon: KeyRound },
  { id: 'fondos', label: 'Colores de fondos', icon: Palette },
  { id: 'excel', label: 'Excel Onedrive', icon: FileSpreadsheet },
  { id: 'outlook', label: 'Correo Outlook', icon: Mail },
  { id: 'roles', label: 'Cuentas logueadas', icon: Users },
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
  const [guestConfigured, setGuestConfigured] = useState(EMPTY_GUEST_FLAGS);
  const [guestCodes, setGuestCodes] = useState(EMPTY_GUEST_CODES);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCodes, setSavingCodes] = useState(false);
  const [testing, setTesting] = useState(false);
  const [excelPath, setExcelPath] = useState('');
  const [impulsaSheet, setImpulsaSheet] = useState('IMPULSA');
  const [impulsaSyncedAt, setImpulsaSyncedAt] = useState<string | null>(null);
  const [impulsaRowCount, setImpulsaRowCount] = useState(0);
  const [aceleradoraSheet, setAceleradoraSheet] = useState('ACELERADORA');
  const [aceleradoraSyncedAt, setAceleradoraSyncedAt] = useState<string | null>(
    null,
  );
  const [aceleradoraRowCount, setAceleradoraRowCount] = useState(0);
  const [movelabSheet, setMovelabSheet] = useState('MoveLab');
  const [movelabSyncedAt, setMovelabSyncedAt] = useState<string | null>(null);
  const [movelabRowCount, setMovelabRowCount] = useState(0);
  const [vcmSheet, setVcmSheet] = useState('Fondo VcM');
  const [vcmSyncedAt, setVcmSyncedAt] = useState<string | null>(null);
  const [vcmRowCount, setVcmRowCount] = useState(0);
  const [savingExcel, setSavingExcel] = useState(false);
  const [testingExcelFile, setTestingExcelFile] = useState(false);
  const [updatingExcelAll, setUpdatingExcelAll] = useState(false);
  const [roleLevels, setRoleLevels] = useState<PortalSessionRoleLevels>(
    DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
  );
  const [savingRoles, setSavingRoles] = useState(false);
  const [outlookUser, setOutlookUser] = useState('');
  const [outlookPassword, setOutlookPassword] = useState('');
  const [outlookHost, setOutlookHost] = useState(PORTAL_OUTLOOK_DEFAULT_HOST);
  const [outlookPort, setOutlookPort] = useState(String(PORTAL_OUTLOOK_DEFAULT_PORT));
  const [outlookConfigured, setOutlookConfigured] = useState(false);
  const [outlookMasked, setOutlookMasked] = useState('');
  const [savingOutlook, setSavingOutlook] = useState(false);
  const [testingOutlook, setTestingOutlook] = useState(false);
  const [contactHtml, setContactHtml] = useState(
    PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
  );
  const [savingContactHtml, setSavingContactHtml] = useState(false);
  const [fondoColors, setFondoColors] = useState<PortalFondoColorItem[]>([]);
  const [savingFondos, setSavingFondos] = useState(false);
  const [tab, setTab] = useState<PortalSettingsTab>('ai');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTab('ai');
    setError('');
    setInfo('');
    setApiKey('');
    setGuestCodes({ ...EMPTY_GUEST_CODES });
    setOutlookPassword('');
    setLoading(true);
    void Promise.all([
      getVitrinaAiSettings(),
      getPortalGuestSettings(),
      getImpulsaExcelSettings(),
      getVcmExcelSettings(),
      getMoveLabExcelSettings(),
      getAceleradoraExcelSettings(),
      getPortalSessionRoleSettings(),
      getPortalOutlookSettings(),
      getPortalFondoColors(),
    ]).then(
      ([
        aiResult,
        guestResult,
        impulsaResult,
        vcmResult,
        movelabResult,
        aceleradoraResult,
        roleResult,
        outlookResult,
        fondosResult,
      ]) => {
        if (cancelled) return;
        setLoading(false);
        if (outlookResult.success && outlookResult.data) {
          setOutlookConfigured(outlookResult.data.configured);
          setOutlookUser(outlookResult.data.user);
          setOutlookMasked(outlookResult.data.passwordMasked);
          setOutlookHost(outlookResult.data.host);
          setOutlookPort(String(outlookResult.data.port));
          setContactHtml(
            outlookResult.data.htmlTemplate ||
              PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
          );
        }
        if (fondosResult.success && fondosResult.data) {
          setFondoColors(fondosResult.data);
        }
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
          setExcelPath(impulsaResult.data.filePath);
          setImpulsaSheet(impulsaResult.data.sheetName);
          setImpulsaSyncedAt(impulsaResult.data.lastSyncedAt);
          setImpulsaRowCount(impulsaResult.data.rowCount);
        }
        if (vcmResult.success && vcmResult.data) {
          if (!impulsaResult.success || !impulsaResult.data?.filePath) {
            setExcelPath(vcmResult.data.filePath);
          }
          setVcmSheet(vcmResult.data.sheetName);
          setVcmSyncedAt(vcmResult.data.lastSyncedAt);
          setVcmRowCount(vcmResult.data.rowCount);
        }
        if (movelabResult.success && movelabResult.data) {
          setMovelabSheet(movelabResult.data.sheetName);
          setMovelabSyncedAt(movelabResult.data.lastSyncedAt);
          setMovelabRowCount(movelabResult.data.rowCount);
        }
        if (aceleradoraResult.success && aceleradoraResult.data) {
          setAceleradoraSheet(aceleradoraResult.data.sheetName);
          setAceleradoraSyncedAt(aceleradoraResult.data.lastSyncedAt);
          setAceleradoraRowCount(aceleradoraResult.data.rowCount);
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
    setGuestCodes({ ...EMPTY_GUEST_CODES });
    const next = await getPortalGuestSettings();
    if (next.success && next.data) setGuestConfigured(next.data);
    setInfo('Códigos de invitado actualizados.');
  }

  async function handleClearCode(key: PortalGuestCodeKey) {
    setError('');
    setInfo('');
    setSavingCodes(true);
    const result = await savePortalGuestSettings({
      codes: {},
      clear: { [key]: true },
    });
    setSavingCodes(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo quitar el código');
      return;
    }
    const next = await getPortalGuestSettings();
    if (next.success && next.data) setGuestConfigured(next.data);
    const label =
      typeof key === 'number' ? `nivel ${key}` : PROFILE_LABEL[key];
    setInfo(`Código de ${label} eliminado.`);
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

  async function persistExcelConfig(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    const path = excelPath.trim();
    const [impulsa, aceleradora, movelab, vcm] = await Promise.all([
      saveImpulsaExcelSettings({
        filePath: path,
        sheetName: impulsaSheet,
      }),
      saveAceleradoraExcelSettings({
        filePath: path,
        sheetName: aceleradoraSheet,
      }),
      saveMoveLabExcelSettings({
        filePath: path,
        sheetName: movelabSheet,
      }),
      saveVcmExcelSettings({
        filePath: path,
        sheetName: vcmSheet,
      }),
    ]);
    if (!impulsa.success || !impulsa.data) {
      return {
        ok: false,
        error: impulsa.error ?? 'No se pudo guardar Fondo Impulsa',
      };
    }
    if (!aceleradora.success || !aceleradora.data) {
      return {
        ok: false,
        error: aceleradora.error ?? 'No se pudo guardar Aceleradora',
      };
    }
    if (!movelab.success || !movelab.data) {
      return {
        ok: false,
        error: movelab.error ?? 'No se pudo guardar MoveLab',
      };
    }
    if (!vcm.success || !vcm.data) {
      return {
        ok: false,
        error: vcm.error ?? 'No se pudo guardar Vinculación con el Medio',
      };
    }
    setExcelPath(impulsa.data.filePath);
    setImpulsaSheet(impulsa.data.sheetName);
    setImpulsaSyncedAt(impulsa.data.lastSyncedAt);
    setImpulsaRowCount(impulsa.data.rowCount);
    setAceleradoraSheet(aceleradora.data.sheetName);
    setAceleradoraSyncedAt(aceleradora.data.lastSyncedAt);
    setAceleradoraRowCount(aceleradora.data.rowCount);
    setMovelabSheet(movelab.data.sheetName);
    setMovelabSyncedAt(movelab.data.lastSyncedAt);
    setMovelabRowCount(movelab.data.rowCount);
    setVcmSheet(vcm.data.sheetName);
    setVcmSyncedAt(vcm.data.lastSyncedAt);
    setVcmRowCount(vcm.data.rowCount);
    return { ok: true };
  }

  async function handleSaveExcel() {
    setError('');
    setInfo('');
    setSavingExcel(true);
    const saved = await persistExcelConfig();
    setSavingExcel(false);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    setInfo('Ruta y hojas de Excel Onedrive guardadas.');
  }

  async function handleTestExcelFile() {
    setError('');
    setInfo('');
    setTestingExcelFile(true);
    const saved = await persistExcelConfig();
    if (!saved.ok) {
      setTestingExcelFile(false);
      setError(saved.error);
      return;
    }
    const result = await testImpulsaExcelFile();
    setTestingExcelFile(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo abrir el archivo');
      return;
    }
    setInfo('Archivo Excel encontrado y se abre correctamente.');
  }

  async function handleUpdateExcelAll() {
    setError('');
    setInfo('');
    setUpdatingExcelAll(true);
    const saved = await persistExcelConfig();
    if (!saved.ok) {
      setUpdatingExcelAll(false);
      setError(saved.error);
      return;
    }

    const updates = [
      {
        label: 'Fondo Impulsa',
        run: updateImpulsaExcelSnapshot,
        apply: (data: {
          lastSyncedAt: string | null;
          rowCount: number;
          sheetName: string;
        }) => {
          setImpulsaSyncedAt(data.lastSyncedAt);
          setImpulsaRowCount(data.rowCount);
          setImpulsaSheet(data.sheetName);
        },
      },
      {
        label: 'Aceleradora',
        run: updateAceleradoraExcelSnapshot,
        apply: (data: {
          lastSyncedAt: string | null;
          rowCount: number;
          sheetName: string;
        }) => {
          setAceleradoraSyncedAt(data.lastSyncedAt);
          setAceleradoraRowCount(data.rowCount);
          setAceleradoraSheet(data.sheetName);
        },
      },
      {
        label: 'MoveLab',
        run: updateMoveLabExcelSnapshot,
        apply: (data: {
          lastSyncedAt: string | null;
          rowCount: number;
          sheetName: string;
        }) => {
          setMovelabSyncedAt(data.lastSyncedAt);
          setMovelabRowCount(data.rowCount);
          setMovelabSheet(data.sheetName);
        },
      },
      {
        label: 'Vinculación con el Medio',
        run: updateVcmExcelSnapshot,
        apply: (data: {
          lastSyncedAt: string | null;
          rowCount: number;
          sheetName: string;
        }) => {
          setVcmSyncedAt(data.lastSyncedAt);
          setVcmRowCount(data.rowCount);
          setVcmSheet(data.sheetName);
        },
      },
    ] as const;

    const lines: string[] = [];
    let anyOk = false;
    for (const item of updates) {
      const result = await item.run();
      if (result.success && result.data) {
        item.apply(result.data);
        anyOk = true;
        lines.push(
          `${item.label}: ${result.data.rowCount} fila${result.data.rowCount === 1 ? '' : 's'}`,
        );
      } else {
        lines.push(
          `${item.label}: ${result.error ?? 'No se pudo actualizar'}`,
        );
      }
    }

    setUpdatingExcelAll(false);
    setInfo(lines.join('. ') + '.');
    if (anyOk) router.refresh();
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

  async function handleSaveOutlook(clearPassword = false) {
    setError('');
    setInfo('');
    setSavingOutlook(true);
    const result = await savePortalOutlookSettings({
      user: outlookUser,
      password: outlookPassword,
      host: outlookHost,
      port: outlookPort,
      clearPassword,
    });
    setSavingOutlook(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar Outlook');
      return;
    }
    setOutlookPassword('');
    const next = await getPortalOutlookSettings();
    if (next.success && next.data) {
      setOutlookConfigured(next.data.configured);
      setOutlookUser(next.data.user);
      setOutlookMasked(next.data.passwordMasked);
      setOutlookHost(next.data.host);
      setOutlookPort(String(next.data.port));
    }
    setInfo(
      clearPassword
        ? 'Credenciales de Outlook eliminadas.'
        : 'Correo Outlook guardado.',
    );
  }

  async function handleTestOutlook() {
    setError('');
    setInfo('');
    setTestingOutlook(true);
    const result = await testPortalOutlook({
      user: outlookUser,
      password: outlookPassword,
      host: outlookHost,
      port: outlookPort,
    });
    setTestingOutlook(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo conectar a Outlook');
      return;
    }
    setInfo('Conexión SMTP de Outlook correcta.');
  }

  async function handleSaveContactHtml() {
    setError('');
    setInfo('');
    setSavingContactHtml(true);
    const result = await savePortalContactEmailTemplate({ html: contactHtml });
    setSavingContactHtml(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar el formato del correo');
      return;
    }
    setInfo('Formato del correo guardado.');
  }

  async function handleSaveFondos() {
    setError('');
    setInfo('');
    setSavingFondos(true);
    const result = await savePortalFondoColors(
      fondoColors.map((item) => ({
        id: item.id,
        colorHex: item.colorHex,
      })),
    );
    setSavingFondos(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudieron guardar los colores');
      return;
    }
    const next = await getPortalFondoColors();
    if (next.success && next.data) setFondoColors(next.data);
    setInfo('Colores de fondos actualizados.');
    router.refresh();
  }

  function updateFondoColor(id: string, raw: string) {
    setFondoColors((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const trimmed = raw.trim();
        if (!trimmed) return { ...item, colorHex: null };
        const hex = normalizeFondoColorHex(trimmed);
        return { ...item, colorHex: hex ?? trimmed };
      }),
    );
  }

  const busy =
    loading ||
    saving ||
    savingCodes ||
    testing ||
    savingExcel ||
    testingExcelFile ||
    updatingExcelAll ||
    savingRoles ||
    savingOutlook ||
    testingOutlook ||
    savingContactHtml ||
    savingFondos;
  const hasTypedCode =
    PORTAL_GUEST_LEVELS.some((level) => guestCodes[level].trim()) ||
    PORTAL_GUEST_PROFILES.some((profile) => guestCodes[profile].trim());

  function selectTab(next: PortalSettingsTab) {
    setTab(next);
    setError('');
    setInfo('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(36rem,85%)] w-[min(52rem,calc(100%-2rem))] max-w-[min(52rem,calc(100%-2rem))] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Configuración del portal</DialogTitle>
        </DialogHeader>
        <form
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col gap-3"
          onSubmit={(event) => event.preventDefault()}
        >
        <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
          <input
            type="text"
            name="portal-settings-autofill-user"
            autoComplete="username"
            tabIndex={-1}
          />
          <input
            type="password"
            name="portal-settings-autofill-pass"
            autoComplete="new-password"
            tabIndex={-1}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-0">
          <nav
            aria-label="Secciones de configuración"
            className="flex shrink-0 gap-1 overflow-x-auto border-slate-200 pb-2 sm:w-52 sm:flex-col sm:overflow-visible sm:border-r sm:pb-0 sm:pr-3"
          >
            {SETTINGS_TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectTab(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-emerald-50 font-medium text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto sm:pl-5">
          {tab === 'ai' ? (
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
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore=""
                data-lpignore="true"
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
          ) : null}

          {tab === 'guest' ? (
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
                Códigos generales por nivel, y códigos específicos con reglas
                propias.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Acceso general
              </h4>
              {PORTAL_GUEST_LEVELS.map((level) => (
                <div key={level} className="space-y-1.5">
                  <Label htmlFor={`portal-guest-level-${level}`}>
                    Nivel {level} — {LEVEL_HINT[level]}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`portal-guest-level-${level}`}
                      type="password"
                      autoComplete="new-password"
                      data-1p-ignore=""
                      data-lpignore="true"
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
            </div>
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invitados específicos
              </h4>
              {PORTAL_GUEST_PROFILES.map((profile) => (
                <div key={profile} className="space-y-1.5">
                  <Label htmlFor={`portal-guest-profile-${profile}`}>
                    {PROFILE_LABEL[profile]} — {portalProfileCaption(profile)}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`portal-guest-profile-${profile}`}
                      type="password"
                      autoComplete="new-password"
                      data-1p-ignore=""
                      data-lpignore="true"
                      value={guestCodes[profile]}
                      onChange={(e) =>
                        setGuestCodes((current) => ({
                          ...current,
                          [profile]: e.target.value,
                        }))
                      }
                      placeholder={
                        guestConfigured[profile]
                          ? 'Configurado. Escribe uno nuevo para reemplazar'
                          : 'Sin configurar'
                      }
                      disabled={busy}
                    />
                    {guestConfigured[profile] ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 text-red-600 hover:text-red-700"
                        onClick={() => void handleClearCode(profile)}
                        disabled={busy}
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
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
          ) : null}

          {tab === 'fondos' ? (
          <section
            aria-labelledby="portal-settings-fondos"
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <h3
                id="portal-settings-fondos"
                className="text-sm font-semibold text-slate-900"
              >
                Colores de fondos
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Define el color de la franja en las tarjetas y en los gráficos
                del portal. Vacío usa el color automático por nombre.
              </p>
            </div>
            {fondoColors.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay fondos en el catálogo.
              </p>
            ) : (
              <ul className="space-y-3">
                {fondoColors.map((fondo) => {
                  const preview = normalizeFondoColorHex(fondo.colorHex ?? '')
                    ?? fondo.fallbackHex;
                  const inputValue = fondo.colorHex ?? '';
                  return (
                    <li
                      key={fondo.id}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-md border border-slate-200"
                        style={{ backgroundColor: preview }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {fondo.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Automático: {fondo.fallbackHex}
                        </p>
                      </div>
                      <Input
                        type="color"
                        aria-label={`Selector de color de ${fondo.nombre}`}
                        className="h-9 w-12 cursor-pointer p-1"
                        value={preview}
                        onChange={(e) =>
                          updateFondoColor(fondo.id, e.target.value)
                        }
                        disabled={busy}
                      />
                      <Input
                        id={`portal-fondo-color-${fondo.id}`}
                        aria-label={`Color hex de ${fondo.nombre}`}
                        className="w-28 font-mono uppercase"
                        value={inputValue}
                        placeholder={fondo.fallbackHex}
                        onChange={(e) =>
                          updateFondoColor(fondo.id, e.target.value)
                        }
                        disabled={busy}
                      />
                      {fondo.colorHex ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-slate-600"
                          onClick={() => updateFondoColor(fondo.id, '')}
                          disabled={busy}
                        >
                          Automático
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="pt-1">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleSaveFondos()}
                disabled={busy || fondoColors.length === 0}
              >
                {savingFondos ? 'Guardando…' : 'Guardar colores'}
              </Button>
            </div>
          </section>
          ) : null}

          {tab === 'excel' ? (
          <section
            aria-labelledby="portal-settings-excel"
            className="flex min-w-0 flex-col gap-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <h3
                id="portal-settings-excel"
                className="text-sm font-semibold text-slate-900"
              >
                Excel Onedrive
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                Actualizar solo desde este equipo con OneDrive sincronizado. El
                portal publicado muestra el último snapshot, no lee el archivo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excel-onedrive-path">Ruta del archivo .xlsx</Label>
              <Input
                id="excel-onedrive-path"
                value={excelPath}
                onChange={(e) => setExcelPath(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">Fondo Impulsa</p>
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="excel-sheet-impulsa">Hoja</Label>
                  <Input
                    id="excel-sheet-impulsa"
                    value={impulsaSheet}
                    onChange={(e) => setImpulsaSheet(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {impulsaSyncedAt
                    ? `Última actualización: ${new Date(impulsaSyncedAt).toLocaleString('es-CL')} (${impulsaRowCount} filas)`
                    : 'Aún no hay snapshot de Fondo Impulsa.'}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">Aceleradora</p>
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="excel-sheet-aceleradora">Hoja</Label>
                  <Input
                    id="excel-sheet-aceleradora"
                    value={aceleradoraSheet}
                    onChange={(e) => setAceleradoraSheet(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {aceleradoraSyncedAt
                    ? `Última actualización: ${new Date(aceleradoraSyncedAt).toLocaleString('es-CL')} (${aceleradoraRowCount} filas)`
                    : 'Aún no hay snapshot de Aceleradora.'}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">MoveLab</p>
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="excel-sheet-movelab">Hoja</Label>
                  <Input
                    id="excel-sheet-movelab"
                    value={movelabSheet}
                    onChange={(e) => setMovelabSheet(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {movelabSyncedAt
                    ? `Última actualización: ${new Date(movelabSyncedAt).toLocaleString('es-CL')} (${movelabRowCount} filas)`
                    : 'Aún no hay snapshot de MoveLab.'}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">
                  Vinculación con el Medio
                </p>
                <div className="mt-2 space-y-1.5">
                  <Label htmlFor="excel-sheet-vcm">Hoja</Label>
                  <Input
                    id="excel-sheet-vcm"
                    value={vcmSheet}
                    onChange={(e) => setVcmSheet(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {vcmSyncedAt
                    ? `Última actualización: ${new Date(vcmSyncedAt).toLocaleString('es-CL')} (${vcmRowCount} filas)`
                    : 'Aún no hay snapshot de Vinculación con el Medio.'}
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveExcel()}
                disabled={busy}
              >
                {savingExcel ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleTestExcelFile()}
                disabled={busy}
              >
                {testingExcelFile ? 'Probando…' : 'Probar archivo'}
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleUpdateExcelAll()}
                disabled={busy}
              >
                {updatingExcelAll ? 'Actualizando…' : 'Actualizar todo'}
              </Button>
            </div>
          </section>
          ) : null}

          {tab === 'outlook' ? (
        <section
          aria-labelledby="portal-settings-outlook"
          className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="mb-4">
            <h3
              id="portal-settings-outlook"
              className="text-sm font-semibold text-slate-900"
            >
              Correo Outlook
            </h3>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              Cuenta SMTP que envía los mensajes de Contactar. Con MFA usa una
              contraseña de aplicación. El remitente del visitante va como
              respuesta (Reply-To).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-outlook-user">Correo de la cuenta</Label>
              <Input
                id="portal-outlook-user"
                type="text"
                inputMode="email"
                autoComplete="off"
                data-1p-ignore=""
                data-lpignore="true"
                value={outlookUser}
                onChange={(e) => setOutlookUser(e.target.value)}
                placeholder="centroinnovacion@aiep.cl"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-outlook-password">Contraseña</Label>
              <Input
                id="portal-outlook-password"
                type="password"
                data-1p-ignore=""
                data-lpignore="true"
                autoComplete="new-password"
                value={outlookPassword}
                onChange={(e) => setOutlookPassword(e.target.value)}
                placeholder={
                  outlookConfigured && outlookMasked
                    ? `Configurada (${outlookMasked})`
                    : 'Contraseña o contraseña de aplicación'
                }
                disabled={busy}
              />
              {outlookConfigured && !outlookPassword ? (
                <p className="text-xs text-slate-500">
                  Deja el campo vacío para conservar la contraseña actual.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-outlook-host">Servidor SMTP</Label>
              <Input
                id="portal-outlook-host"
                value={outlookHost}
                onChange={(e) => setOutlookHost(e.target.value)}
                placeholder={PORTAL_OUTLOOK_DEFAULT_HOST}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-outlook-port">Puerto</Label>
              <Input
                id="portal-outlook-port"
                value={outlookPort}
                onChange={(e) => setOutlookPort(e.target.value)}
                placeholder={String(PORTAL_OUTLOOK_DEFAULT_PORT)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTestOutlook()}
              disabled={busy}
            >
              {testingOutlook ? 'Probando…' : 'Probar conexión'}
            </Button>
            {outlookConfigured ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => void handleSaveOutlook(true)}
                disabled={busy}
              >
                Quitar credenciales
              </Button>
            ) : null}
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void handleSaveOutlook(false)}
              disabled={
                busy || (!outlookConfigured && !outlookPassword.trim())
              }
            >
              {savingOutlook ? 'Guardando…' : 'Guardar Outlook'}
            </Button>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-900">
              Formato del correo
            </h4>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              Define cómo se ve el mensaje de Contactar. Usa negrita y otros
              estilos; inserta Proyecto, Remitente, Mensaje y Firma. La firma
              del visitante se pega al enviar, no se previsualiza en el
              formulario.
            </p>
            <div className="mt-3">
              <PortalContactHtmlEditor
                value={contactHtml}
                onChange={setContactHtml}
                disabled={busy}
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Vista previa (texto de ejemplo)</Label>
              <div
                data-testid="portal-contact-email-preview"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                dangerouslySetInnerHTML={{
                  __html: applyPortalContactHtmlTemplate(
                    contactHtml,
                    PORTAL_CONTACT_EMAIL_SAMPLE,
                  ),
                }}
              />
            </div>
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveContactHtml()}
                disabled={busy}
              >
                {savingContactHtml ? 'Guardando…' : 'Guardar formato'}
              </Button>
            </div>
          </div>
        </section>
          ) : null}

          {tab === 'roles' ? (
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
          ) : null}
          </div>
        </div>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}

