export const VITRINA_SEDE_EMPRENDEDOR_EXTERNO = 'Emprendedor/a Externo';

export function vitrinaCardUsesComunasInPlaceOfEscuelas(
  sedes: string[],
): boolean {
  const target = VITRINA_SEDE_EMPRENDEDOR_EXTERNO.trim().toLowerCase();
  return sedes.some((sede) => sede.trim().toLowerCase() === target);
}
