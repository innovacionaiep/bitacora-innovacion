// Tipos para TypeScript - Los clientes ahora están en archivos separados
export type Database = {
  public: {
    Tables: {
      proyectos: {
        Row: {
          id: string;
          proyecto: string;
          fondo: string;
          sede: string;
          escuela: string;
          avance_gantt: number;
          objetivos: number;
          presupuesto_usado: number;
          presupuesto_total: number;
          reuniones_hechas: number;
          reuniones_totales: number;
          participantes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proyecto: string;
          fondo: string;
          sede: string;
          escuela: string;
          avance_gantt: number;
          objetivos: number;
          presupuesto_usado: number;
          presupuesto_total: number;
          reuniones_hechas: number;
          reuniones_totales: number;
          participantes: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proyecto?: string;
          fondo?: string;
          sede?: string;
          escuela?: string;
          avance_gantt?: number;
          objetivos?: number;
          presupuesto_usado?: number;
          presupuesto_total?: number;
          reuniones_hechas?: number;
          reuniones_totales?: number;
          participantes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
