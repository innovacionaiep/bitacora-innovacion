'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  History,
  MapPin,
  GraduationCap,
  AlertCircle,
  Users,
  Lightbulb,
  Heart,
  Target,
  BarChart3,
  Zap,
  TrendingUp,
  Globe,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DesarrolloTecnico } from '@prisma/client';

interface DesarrolloTecnicoCardProps {
  desarrolloTecnico?: DesarrolloTecnico | null;
}

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
}) => {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const toggleAllSections = () => {
    // Verificar si todos los campos con contenido están expandidos
    const fieldsWithContent = sections.filter(
      (section) => section.content && section.content.trim() !== ''
    );
    const allExpanded =
      fieldsWithContent.length > 0 &&
      fieldsWithContent.every((section) => expandedSections[section.key]);
    const newExpandedState = !allExpanded;

    setExpandedSections((prev) => {
      const newState: Record<string, boolean> = {};
      sections.forEach((section) => {
        if (section.content && section.content.trim() !== '') {
          newState[section.key] = newExpandedState;
        }
      });
      return newState;
    });
  };

  if (!desarrolloTecnico) {
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

  const sections = [
    {
      key: 'continuidad',
      title: 'Continuidad de Fases Anteriores',
      content: desarrolloTecnico.continuidadFasesAnteriores,
      icon: <History className="h-4 w-4" />,
    },
    {
      key: 'pertinenciaLocal',
      title: 'Pertinencia Local',
      content: desarrolloTecnico.pertinenciaLocal,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      key: 'pertinenciaDisciplinar',
      title: 'Pertinencia Disciplinar',
      content: desarrolloTecnico.pertinenciaDisciplinar,
      icon: <GraduationCap className="h-4 w-4" />,
    },
    {
      key: 'necesidad',
      title: 'Necesidad, Problema u Oportunidad',
      content: desarrolloTecnico.necesidadProblema,
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      key: 'publicoObjetivo',
      title: 'Público Objetivo',
      content: desarrolloTecnico.publicoObjetivo,
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'solucion',
      title: 'Solución y Nivel de Avance',
      content: desarrolloTecnico.solucionAvance,
      icon: <Lightbulb className="h-4 w-4" />,
    },
    {
      key: 'genero',
      title: 'Perspectiva de Género',
      content: desarrolloTecnico.perspectiveGenero,
      icon: <Heart className="h-4 w-4" />,
    },
    {
      key: 'resultados',
      title: 'Resultados y Contribución Esperada',
      content: desarrolloTecnico.resultadosContribucion,
      icon: <Target className="h-4 w-4" />,
    },
    {
      key: 'metodologia',
      title: 'Metodología de Medición',
      content: desarrolloTecnico.metodologiaMedicion,
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: 'ejesImpacto',
      title: 'Ejes de Impacto',
      content: desarrolloTecnico.ejesImpacto,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      key: 'factorInnovador',
      title: 'Factor Innovador',
      content: desarrolloTecnico.factorInnovador,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      key: 'escalabilidad',
      title: 'Escalabilidad',
      content: desarrolloTecnico.escalabilidad,
      icon: <Globe className="h-4 w-4" />,
    },
  ];

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
