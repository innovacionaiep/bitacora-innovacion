'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DesarrolloTecnico } from '@prisma/client';
import { IconByName } from '@/components/config/IconByName';
import { getCategoriasWithSubcategorias } from '@/lib/actions/desarrollo-tecnico-config';
import {
  isLegacyDtFieldKey,
  type DesarrolloTecnicoFieldKey,
} from '@/app/proyectos/tabs/general-tab-utils';

interface DesarrolloTecnicoCardProps {
  desarrolloTecnico?: DesarrolloTecnico | null;
  desarrolloTecnicoValores?: Array<{
    subcategoriaId: string;
    valor: string;
  }> | null;
}

const DEFAULT_SECTIONS: Array<{
  key: string;
  campoKey: DesarrolloTecnicoFieldKey | null;
  title: string;
  icon: string;
}> = [
  {
    key: 'continuidadFasesAnteriores',
    campoKey: 'continuidadFasesAnteriores',
    title: 'Continuidad de Fases Anteriores',
    icon: 'History',
  },
  {
    key: 'pertinenciaLocal',
    campoKey: 'pertinenciaLocal',
    title: 'Pertinencia Local',
    icon: 'MapPin',
  },
  {
    key: 'pertinenciaDisciplinar',
    campoKey: 'pertinenciaDisciplinar',
    title: 'Pertinencia Disciplinar',
    icon: 'GraduationCap',
  },
  {
    key: 'necesidadProblema',
    campoKey: 'necesidadProblema',
    title: 'Necesidad, Problema u Oportunidad',
    icon: 'AlertCircle',
  },
  {
    key: 'publicoObjetivo',
    campoKey: 'publicoObjetivo',
    title: 'Público Objetivo',
    icon: 'Users',
  },
  {
    key: 'solucionAvance',
    campoKey: 'solucionAvance',
    title: 'Solución y Nivel de Avance',
    icon: 'Lightbulb',
  },
  {
    key: 'perspectiveGenero',
    campoKey: 'perspectiveGenero',
    title: 'Perspectiva de Género',
    icon: 'Heart',
  },
  {
    key: 'resultadosContribucion',
    campoKey: 'resultadosContribucion',
    title: 'Resultados y Contribución Esperada',
    icon: 'Target',
  },
  {
    key: 'metodologiaMedicion',
    campoKey: 'metodologiaMedicion',
    title: 'Metodología de Medición',
    icon: 'BarChart3',
  },
  {
    key: 'ejesImpacto',
    campoKey: 'ejesImpacto',
    title: 'Ejes de Impacto',
    icon: 'Zap',
  },
  {
    key: 'factorInnovador',
    campoKey: 'factorInnovador',
    title: 'Factor Innovador',
    icon: 'TrendingUp',
  },
  {
    key: 'escalabilidad',
    campoKey: 'escalabilidad',
    title: 'Escalabilidad',
    icon: 'Globe',
  },
];

interface ExpandableSectionProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  content,
  icon,
  isExpanded,
  onToggle,
}) => {
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-3">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="text-gray-600">{icon}</div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export const DesarrolloTecnicoCard: React.FC<DesarrolloTecnicoCardProps> = ({
  desarrolloTecnico,
  desarrolloTecnicoValores,
}) => {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [sectionMeta, setSectionMeta] = useState(DEFAULT_SECTIONS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const categorias = await getCategoriasWithSubcategorias();
        if (cancelled) return;
        const next = categorias.flatMap((cat) =>
          cat.subcategorias.map((sub) => {
            const campoKey = isLegacyDtFieldKey(sub.campoKey)
              ? sub.campoKey
              : null;
            return {
              key: sub.id,
              campoKey,
              title: sub.nombre?.trim() || 'Sin nombre',
              icon: sub.icono || 'FileText',
            };
          })
        );
        if (next.length > 0) setSectionMeta(next);
      } catch {
        // Mantener defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const valoresBySubId = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of desarrolloTecnicoValores ?? []) {
      map.set(v.subcategoriaId, v.valor ?? '');
    }
    return map;
  }, [desarrolloTecnicoValores]);

  const sections = sectionMeta.map((meta) => {
    let content: string | null = null;
    if (meta.campoKey && desarrolloTecnico) {
      content = desarrolloTecnico[meta.campoKey] ?? null;
    }
    if (!content?.trim()) {
      content = valoresBySubId.get(meta.key) ?? null;
    }
    return {
      key: meta.key,
      title: meta.title,
      content,
      icon: <IconByName name={meta.icon} className="h-4 w-4" />,
    };
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const toggleAllSections = () => {
    const fieldsWithContent = sections.filter(
      (section) => section.content && section.content.trim() !== ''
    );
    const allExpanded =
      fieldsWithContent.length > 0 &&
      fieldsWithContent.every((section) => expandedSections[section.key]);
    const newExpandedState = !allExpanded;

    setExpandedSections(() => {
      const newState: Record<string, boolean> = {};
      sections.forEach((section) => {
        if (section.content && section.content.trim() !== '') {
          newState[section.key] = newExpandedState;
        }
      });
      return newState;
    });
  };

  if (!desarrolloTecnico && !(desarrolloTecnicoValores?.length)) {
    return (
      <Card className="h-full shadow-xl flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-200 px-4 py-3 rounded-t-lg flex-shrink-0">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-800" />
              <h3 className="text-base font-semibold text-gray-800 uppercase tracking-wide">
                Desarrollo Técnico
              </h3>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-auto min-h-0 custom-scrollbar">
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Información de desarrollo técnico no disponible</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-xl flex flex-col min-h-0">
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-200 px-4 py-3 rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-800" />
              <h3 className="text-base font-semibold text-gray-800 uppercase tracking-wide">
                Desarrollo Técnico
              </h3>
            </div>
            <button
              onClick={toggleAllSections}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title={(() => {
                const fieldsWithContent = sections.filter(
                  (section) => section.content && section.content.trim() !== ''
                );
                const allExpanded =
                  fieldsWithContent.length > 0 &&
                  fieldsWithContent.every(
                    (section) => expandedSections[section.key]
                  );
                return allExpanded ? 'Contraer todo' : 'Expandir todo';
              })()}
            >
              {(() => {
                const fieldsWithContent = sections.filter(
                  (section) => section.content && section.content.trim() !== ''
                );
                const allExpanded =
                  fieldsWithContent.length > 0 &&
                  fieldsWithContent.every(
                    (section) => expandedSections[section.key]
                  );
                return allExpanded ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    Contraer todo
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    Expandir todo
                  </>
                );
              })()}
            </button>
          </div>
        </div>
        <div className="p-6 flex-1 overflow-auto min-h-0 custom-scrollbar">
          <div className="space-y-3">
            {sections.map((section) => (
              <ExpandableSection
                key={section.key}
                title={section.title}
                content={section.content || ''}
                icon={section.icon}
                isExpanded={expandedSections[section.key] || false}
                onToggle={() => toggleSection(section.key)}
              />
            ))}
          </div>

          {sections.every(
            (section) => !section.content || section.content.trim() === ''
          ) && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay información de desarrollo técnico disponible</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
