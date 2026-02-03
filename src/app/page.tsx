'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home as HomeIcon, BarChart3, FolderKanban, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8 w-full">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-bold tracking-tight">
          Bienvenido a BITACORA
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tu sistema de gestión de proyectos todo en uno. Organiza, planifica y
          realiza seguimiento de todos tus proyectos en un solo lugar.
        </p>
        <div className="flex gap-4 justify-center pt-6">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8">
              Ir al Dashboard
            </Button>
          </Link>
          <Link href="/proyectos">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver Proyectos
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderKanban className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Gestión de Proyectos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Administra todos tus proyectos con seguimiento detallado de
              avances, presupuestos y entregables.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Indicadores</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Visualiza métricas clave y KPIs para tomar decisiones informadas
              sobre tus proyectos.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Colaboración</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Trabaja en equipo con roles definidos, seguimiento de actividades
              y comunicación centralizada.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Section */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <HomeIcon className="h-5 w-5" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Link href="/proyectos">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <FolderKanban className="h-5 w-5" />
                  <span>Proyectos</span>
                </Button>
              </Link>
              <Link href="/gantt">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Gantt</span>
                </Button>
              </Link>
              <Link href="/indicadores">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex-col gap-2"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Indicadores</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
