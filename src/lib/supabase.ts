import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para TypeScript
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
