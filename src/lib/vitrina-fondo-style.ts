const FONDO_STRIPES = [
  'bg-red-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-orange-500',
  'bg-violet-600',
  'bg-cyan-500',
] as const;

const LINEA_STRIPES = [
  'bg-sky-600',
  'bg-teal-600',
  'bg-amber-500',
  'bg-indigo-600',
  'bg-rose-500',
  'bg-lime-600',
] as const;

const SEDE_STRIPES = [
  'bg-slate-600',
  'bg-slate-500',
  'bg-zinc-600',
  'bg-neutral-600',
  'bg-stone-600',
  'bg-gray-600',
] as const;

const ESCUELA_STRIPES = [
  'bg-blue-600',
  'bg-sky-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-blue-500',
  'bg-sky-500',
] as const;

const ETIQUETA_STRIPES = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-green-600',
  'bg-emerald-500',
  'bg-lime-600',
  'bg-teal-500',
] as const;

function normalizeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hashedStripe(nombre: string, stripes: readonly string[]): string {
  let sum = 0;
  for (let i = 0; i < nombre.length; i++) {
    sum += nombre.charCodeAt(i);
  }
  return stripes[sum % stripes.length] ?? 'bg-slate-800';
}

const STRIPE_TO_HEX: Record<string, string> = {
  'bg-red-600': '#dc2626',
  'bg-emerald-600': '#059669',
  'bg-blue-600': '#2563eb',
  'bg-orange-500': '#f97316',
  'bg-violet-600': '#7c3aed',
  'bg-cyan-500': '#06b6d4',
  'bg-[#DC143C]': '#DC143C',
  'bg-slate-800': '#1e293b',
};

const FONDO_FILL_FALLBACK = '#64748b';
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;

export type VitrinaStripePaint = {
  className: string;
  style?: { backgroundColor: string };
};

export function normalizeFondoColorHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_RE.test(withHash)) return null;
  return withHash.toUpperCase();
}

export function buildFondoColorMap(
  fondos: Array<{ nombre: string; colorHex?: string | null }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const fondo of fondos) {
    const hex = normalizeFondoColorHex(fondo.colorHex ?? '');
    if (!hex || !fondo.nombre.trim()) continue;
    map[fondo.nombre] = hex;
  }
  return map;
}

function colorFromMap(
  nombre: string,
  colors?: Record<string, string>,
): string | undefined {
  if (!colors) return undefined;
  const direct = colors[nombre];
  if (direct) return direct;
  const key = normalizeNombre(nombre);
  for (const [label, hex] of Object.entries(colors)) {
    if (normalizeNombre(label) === key) return hex;
  }
  const first = nombre.split(' · ')[0]?.trim();
  if (first && first !== nombre) return colorFromMap(first, colors);
  return undefined;
}

export function vitrinaFondoLabel(fondos: string[]): string {
  return fondos.filter(Boolean).join(' · ');
}

export function vitrinaFondoFillColor(
  nombre: string,
  colors?: Record<string, string>,
): string {
  if (!nombre.trim()) return FONDO_FILL_FALLBACK;
  return (
    colorFromMap(nombre, colors) ??
    STRIPE_TO_HEX[vitrinaFondoStripeClass(nombre)] ??
    FONDO_FILL_FALLBACK
  );
}

export function vitrinaFondoStripePaint(
  nombre: string,
  colors?: Record<string, string>,
): VitrinaStripePaint {
  const custom = colorFromMap(nombre, colors);
  if (custom) return { className: '', style: { backgroundColor: custom } };
  return { className: vitrinaFondoStripeClass(nombre) };
}

export function vitrinaFondoStripeClass(nombre: string): string {
  const key = normalizeNombre(nombre);
  if (key.includes('impulsa')) return 'bg-emerald-600';
  if (key.includes('innovacion docente')) return 'bg-[#DC143C]';
  if (key.includes('incuba')) return 'bg-violet-600';
  return hashedStripe(nombre, FONDO_STRIPES);
}

export function vitrinaLineaStripeClass(nombre: string): string {
  return hashedStripe(nombre, LINEA_STRIPES);
}

export function vitrinaLineaBarStripeClass(
  lineaNombre: string,
  parentFondo?: string,
): string {
  if (parentFondo?.trim()) return vitrinaFondoStripeClass(parentFondo);
  return vitrinaLineaStripeClass(lineaNombre);
}

export function vitrinaLineaBarStripePaint(
  lineaNombre: string,
  parentFondo?: string,
  colors?: Record<string, string>,
): VitrinaStripePaint {
  if (parentFondo?.trim()) return vitrinaFondoStripePaint(parentFondo, colors);
  return { className: vitrinaLineaStripeClass(lineaNombre) };
}

export function vitrinaSedeStripeClass(nombre: string): string {
  return hashedStripe(nombre, SEDE_STRIPES);
}

export function vitrinaEscuelaStripeClass(nombre: string): string {
  return hashedStripe(nombre, ESCUELA_STRIPES);
}

export function vitrinaEtiquetaStripeClass(nombre: string): string {
  return hashedStripe(nombre, ETIQUETA_STRIPES);
}

const CARRERA_STRIPES = [
  'bg-indigo-600',
  'bg-violet-600',
  'bg-purple-600',
  'bg-fuchsia-600',
  'bg-indigo-500',
  'bg-violet-500',
] as const;

const ASIGNATURA_STRIPES = [
  'bg-amber-600',
  'bg-orange-600',
  'bg-yellow-600',
  'bg-amber-500',
  'bg-orange-500',
  'bg-yellow-500',
] as const;

export function vitrinaCarreraStripeClass(nombre: string): string {
  return hashedStripe(nombre, CARRERA_STRIPES);
}

export function vitrinaAsignaturaStripeClass(nombre: string): string {
  return hashedStripe(nombre, ASIGNATURA_STRIPES);
}
