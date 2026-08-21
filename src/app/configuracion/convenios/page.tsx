'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function ConfiguracionConveniosPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pt-4 pb-8">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Convenios</h2>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
            Qué líneas ven el tab Convenio se configura en{' '}
            <Link
              href="/configuracion/lineas"
              className="text-emerald-700 hover:underline font-medium"
            >
              Configuración → Líneas
            </Link>
            . La plantilla bruta es global (
            <span className="font-medium text-gray-700">Convenio_2026.docx</span>
            ).
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50/70 px-4 py-3">
          <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[13px] text-gray-600 leading-relaxed">
            El archivo firmado se guarda por proyecto en la carpeta{' '}
            <code className="text-[12px] bg-white border border-gray-200 px-1 rounded">
              convenios
            </code>{' '}
            de Cloudinary. Al reemplazar se pierde el anterior.
          </p>
        </div>
      </div>
    </div>
  );
}
