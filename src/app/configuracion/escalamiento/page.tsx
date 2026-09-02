import { redirect } from 'next/navigation';

/** La visibilidad del tab Escalamiento se configura en Líneas. */
export default function ConfiguracionEscalamientoPage() {
  redirect('/configuracion/lineas');
}
