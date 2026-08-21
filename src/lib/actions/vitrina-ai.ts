'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz/guards';
import { getVitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
import { allowVitrinaAiHit } from '@/lib/vitrina-ai-rate-limit';
import { buildVitrinaAiCatalogs } from '@/lib/vitrina-ai-index';
import { runVitrinaAiOrchestrator } from '@/lib/vitrina-ai-orchestrator';
import {
  maskOpenRouterKey,
  normalizeVitrinaAiModel,
  VITRINA_AI_DEFAULT_MODEL,
  VITRINA_AI_MAX_MESSAGE_CHARS,
} from '@/lib/vitrina-ai-settings';
import {
  encryptVitrinaAiKey,
  getVitrinaAiEncryptionSecret,
  readVitrinaAiCredentials,
  readVitrinaAiStored,
  writeVitrinaAiStored,
} from '@/lib/vitrina-ai-settings-store';
import { readVitrinaProyectos } from '@/lib/vitrina-proyectos-store';
import { readRequiredEnv } from '@/lib/secrets/env-secrets';
import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';

export type VitrinaAiSettingsView = {
  configured: boolean;
  keyMasked: string;
  model: string;
};

export async function getVitrinaAiPublicStatus(): Promise<{ configured: boolean }> {
  const creds = await readVitrinaAiCredentials();
  return { configured: Boolean(creds) };
}

export async function getVitrinaAiSettings(): Promise<{
  success: boolean;
  data?: VitrinaAiSettingsView;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const stored = await readVitrinaAiStored();
  const creds = stored?.enc ? await readVitrinaAiCredentials() : null;
  return {
    success: true,
    data: {
      configured: Boolean(creds),
      keyMasked: creds ? maskOpenRouterKey(creds.apiKey) : '',
      model: stored?.model || VITRINA_AI_DEFAULT_MODEL,
    },
  };
}

export async function saveVitrinaAiSettings(input: {
  apiKey?: string;
  model: string;
  clearKey?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const secret = getVitrinaAiEncryptionSecret();
  if (!secret) {
    return { success: false, error: 'NEXTAUTH_SECRET no está configurado en el servidor' };
  }

  const stored = await readVitrinaAiStored();
  const model = normalizeVitrinaAiModel(input.model);
  const nextKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';

  let enc = stored?.enc ?? '';
  if (input.clearKey) {
    enc = '';
  } else if (nextKey) {
    enc = encryptVitrinaAiKey(nextKey, secret);
  }

  if (!enc && !input.clearKey) {
    return { success: false, error: 'Incluye la API key de OpenRouter' };
  }

  try {
    await writeVitrinaAiStored({ enc, model });
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] saveVitrinaAiSettings', e);
    return { success: false, error: 'No se pudo guardar la configuración' };
  }
}

export async function testVitrinaOpenRouter(apiKey?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const typed = typeof apiKey === 'string' ? apiKey.trim() : '';
  const key = typed || (await readVitrinaAiCredentials())?.apiKey;
  if (!key) {
    return { success: false, error: 'Incluye la API key de OpenRouter' };
  }

  try {
    const referer = readRequiredEnv('NEXTAUTH_URL') || 'https://bitacora.local';
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': referer,
        'X-Title': 'Bitacora Vitrina',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      return { success: false, error: 'OpenRouter rechazó la API key' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo contactar a OpenRouter' };
  }
}

function clientKeyFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headerList.get('x-real-ip')?.trim() || 'unknown';
}

export async function chatVitrinaAgent(input: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  filters?: VitrinaProjectFilters;
  matchIds?: string[] | null;
}): Promise<{
  success: boolean;
  reply?: string;
  filters?: VitrinaProjectFilters;
  matchIds?: string[] | null;
  error?: string;
}> {
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message) {
    return { success: false, error: 'Escribe qué estás buscando' };
  }
  if (message.length > VITRINA_AI_MAX_MESSAGE_CHARS) {
    return { success: false, error: 'El mensaje es demasiado largo' };
  }

  const headerList = await headers();
  if (!allowVitrinaAiHit(clientKeyFromHeaders(headerList))) {
    return {
      success: false,
      error: 'Demasiadas consultas seguidas. Espera un momento.',
    };
  }

  const creds = await readVitrinaAiCredentials();
  if (!creds) {
    return {
      success: false,
      error: 'El asistente aún no está configurado',
    };
  }

  const [proyectos, catalogs] = await Promise.all([
    readVitrinaProyectos(),
    getVitrinaProjectCatalogs(),
  ]);
  const filterCatalogs = {
    fondos: catalogs.fondos.map((item) => item.nombre),
    sedes: catalogs.sedes.map((item) => item.nombre),
    escuelas: catalogs.escuelas.map((item) => item.nombre),
    etiquetas: catalogs.etiquetas.map((item) => item.nombre),
  };

  const result = await runVitrinaAiOrchestrator({
    apiKey: creds.apiKey,
    model: creds.model,
    userMessage: message,
    history: Array.isArray(input.history) ? input.history : [],
    proyectos,
    catalogs: buildVitrinaAiCatalogs(filterCatalogs, proyectos),
    currentFilters: input.filters,
    currentMatchIds: input.matchIds,
    referer: readRequiredEnv('NEXTAUTH_URL') || undefined,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    reply: result.reply,
    filters: result.applied ? result.filters : undefined,
    matchIds: result.applied ? result.matchIds : undefined,
  };
}
