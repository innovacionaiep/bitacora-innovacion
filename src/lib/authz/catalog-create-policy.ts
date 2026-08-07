/**
 * Políticas de authz al crear entradas de catálogo.
 *
 * Socios comunitarios son un catálogo macro interproyecto (se crean/usan
 * desde el proyecto), no parte de Configuración/Ajustes.
 */
export type CatalogCreateKind =
  | 'socio_comunitario'
  | 'sede'
  | 'comuna'
  | 'escuela'
  | 'carrera'
  | 'grupo_interes'
  | 'asignatura';

/** True si crear el catálogo exige view.ajustes (solo Admin). */
export function catalogCreateRequiresAjustes(kind: CatalogCreateKind): boolean {
  return kind !== 'socio_comunitario';
}
