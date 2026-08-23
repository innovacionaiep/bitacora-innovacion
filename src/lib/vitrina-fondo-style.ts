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

export function vitrinaSedeStripeClass(nombre: string): string {
  return hashedStripe(nombre, SEDE_STRIPES);
}

export function vitrinaEscuelaStripeClass(nombre: string): string {
  return hashedStripe(nombre, ESCUELA_STRIPES);
}

export function vitrinaEtiquetaStripeClass(nombre: string): string {
  return hashedStripe(nombre, ETIQUETA_STRIPES);
}
