const CARRERA_CONNECTORS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'para',
  'por',
  'u',
  'y',
]);

function foldCarreraKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeWord(word: string): string {
  let capNext = true;
  return [...word]
    .map((ch) => {
      if (/\p{L}/u.test(ch)) {
        const next = capNext
          ? ch.toLocaleUpperCase('es')
          : ch.toLocaleLowerCase('es');
        capNext = false;
        return next;
      }
      capNext = true;
      return ch;
    })
    .join('');
}

/** Título de carrera: conceptos con inicial mayúscula; conectores en minúscula. */
export function formatCarreraTitulo(nombre: string): string {
  const trimmed = nombre.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .split(' ')
    .map((word, index) => {
      const folded = foldCarreraKey(word);
      if (index > 0 && CARRERA_CONNECTORS.has(folded)) {
        return word.toLocaleLowerCase('es');
      }
      return capitalizeWord(word);
    })
    .join(' ');
}

export function foldCarreraMatchKey(nombre: string): string {
  return foldCarreraKey(nombre);
}

export function pickPreferredCarreraSource(candidates: string[]): string {
  if (candidates.length === 0) return '';
  return [...candidates].sort((a, b) => {
    const accents = (value: string) =>
      [...value.normalize('NFD')].filter((ch) => /[\u0300-\u036f]/.test(ch))
        .length;
    const byAccent = accents(b) - accents(a);
    if (byAccent !== 0) return byAccent;
    return a.localeCompare(b, 'es');
  })[0]!;
}
