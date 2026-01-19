'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Target, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useIndicadores } from '@/hooks/useIndicadores';
import { useState } from 'react';

interface IndicadoresCardProps {
  projectId: string;
}

export function IndicadoresCard({ projectId }: IndicadoresCardProps) {
  const { data, loading, error, progresoGeneral } = useIndicadores(projectId);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  const toggleObjective = (objectiveId: string) => {
    setExpandedObjectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectiveId)) {
        newSet.delete(objectiveId);
      } else {
        newSet.add(objectiveId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error al cargar indicadores: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.objetivosGenerales.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4">No hay indicadores configurados para este proyecto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Progress Card - Matching Gantt Style */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Indicadores del Proyecto
              </h2>
            </div>
          </div>

          {/* Progress Card - Exact same style as Gantt */}
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-base font-semibold text-gray-900">
                Progreso
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-72 bg-gray-200 rounded-full h-2.5 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progresoGeneral}%` }}
                  ></div>
                </div>
                <span className="text-4xl font-bold text-emerald-600">
                  {progresoGeneral}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full shadow-xl">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Table Header */}
            <div className="bg-gray-800 text-white px-6 py-4 flex-shrink-0">
              <div className="grid grid-cols-10 gap-4 text-sm font-semibold uppercase tracking-wide">
                <div className="col-span-2">Objetivo General</div>
                <div className="col-span-1">Objetivos Específicos</div>
                <div className="col-span-1">Indicador</div>
                <div className="col-span-2">Descripción</div>
                <div className="col-span-1">Forma de Cálculo</div>
                <div className="col-span-1">Resultado Esperado</div>
                <div className="col-span-1">Resultado Alcanzado</div>
                <div className="col-span-1">% Cumplimiento</div>
                <div className="col-span-1">% Avance</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              <div className="divide-y divide-gray-200">
                {data.objetivosGenerales.map((objetivoGeneral) => (
                  <div key={objetivoGeneral.id}>
                    {objetivoGeneral.objetivosEspecificos.map((objetivoEspecifico, specificIndex) => (
                      <div key={objetivoEspecifico.id}>
                        {objetivoEspecifico.indicadores.map((indicador, indicatorIndex) => (
                          <div 
                            key={indicador.id}
                            className={`grid grid-cols-10 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
                              indicatorIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            {/* Objetivo General - Merged cells */}
                            <div className="col-span-2 flex items-center">
                              {specificIndex === 0 && indicatorIndex === 0 && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => toggleObjective(objetivoGeneral.id)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    {expandedObjectives.has(objetivoGeneral.id) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-600" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-600" />
                                    )}
                                  </button>
                                  <Target className="h-4 w-4 text-emerald-600" />
                                  <span className="text-gray-900 font-medium text-sm">
                                    {objetivoGeneral.descripcion}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Objetivos Específicos */}
                            <div className="col-span-1 flex items-center">
                              {indicatorIndex === 0 && (
                                <span className="text-gray-700 text-sm">
                                  {objetivoEspecifico.orden} - {objetivoEspecifico.descripcion}
                                </span>
                              )}
                            </div>

                            {/* Indicador */}
                            <div className="col-span-1 flex items-center">
                              <span className="text-gray-900 font-medium text-sm">
                                {indicador.nombre}
                              </span>
                            </div>

                            {/* Descripción */}
                            <div className="col-span-2 flex items-center">
                              <span className="text-gray-600 text-xs leading-relaxed">
                                {indicador.descripcion}
                              </span>
                            </div>

                            {/* Forma de Cálculo */}
                            <div className="col-span-1 flex items-center">
                              <span className="text-gray-600 text-xs">
                                {indicador.formaCalculo}
                              </span>
                            </div>

                            {/* Resultado Esperado */}
                            <div className="col-span-1 flex items-center">
                              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                                {indicador.resultadoEsperado}
                              </span>
                            </div>

                            {/* Resultado Alcanzado */}
                            <div className="col-span-1 flex items-center">
                              <span className="text-gray-900 font-medium text-sm">
                                {indicador.resultadoAlcanzado}
                              </span>
                            </div>

                            {/* % Cumplimiento */}
                            <div className="col-span-1 flex items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                indicador.porcentajeCumplimiento >= 100 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : indicador.porcentajeCumplimiento >= 80
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {indicador.porcentajeCumplimiento}%
                              </span>
                            </div>

                            {/* % Avance */}
                            <div className="col-span-1 flex items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                indicador.porcentajeAvance >= 100 
                                  ? 'bg-emerald-500 text-white' 
                                  : indicador.porcentajeAvance >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : indicador.porcentajeAvance >= 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {indicador.porcentajeAvance}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Matching Gantt Style */}
      <div className="flex-shrink-0 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Progreso General</p>
              <p className="text-2xl font-bold text-gray-900">{progresoGeneral}%</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Indicadores</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.objetivosGenerales.reduce((sum, og) => 
                  sum + og.objetivosEspecificos.reduce((sum2, oe) => sum2 + oe.indicadores.length, 0), 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Objetivos Generales</p>
              <p className="text-2xl font-bold text-gray-900">{data.objetivosGenerales.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
