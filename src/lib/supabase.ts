// Tipos para TypeScript - Los clientes ahora están en archivos separados
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          active_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          active_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          active_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_account_types: {
        Row: {
          id: string;
          user_id: string;
          account_type:
            | 'Admin'
            | 'Coordinador'
            | 'Colaborador'
            | 'Encargado'
            | 'Docente'
            | 'Estudiante'
            | 'Beneficiario';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_type:
            | 'Admin'
            | 'Coordinador'
            | 'Colaborador'
            | 'Encargado'
            | 'Docente'
            | 'Estudiante'
            | 'Beneficiario';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_type?:
            | 'Admin'
            | 'Coordinador'
            | 'Colaborador'
            | 'Encargado'
            | 'Docente'
            | 'Estudiante'
            | 'Beneficiario';
          created_at?: string;
        };
      };
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
      activities: {
        Row: {
          id: string;
          name: string;
          description: string;
          progress: number;
          project_id: string;
          color: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          progress?: number;
          project_id: string;
          color: string;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          progress?: number;
          project_id?: string;
          color?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          name: string;
          description: string;
          completed: boolean;
          start_date: string;
          end_date: string;
          progress: number;
          activity_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          completed?: boolean;
          start_date: string;
          end_date: string;
          progress?: number;
          activity_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          completed?: boolean;
          start_date?: string;
          end_date?: string;
          progress?: number;
          activity_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Tipos de cuenta disponibles - Ver docs/SISTEMA-ROLES.md
export type AccountType =
  Database['public']['Tables']['user_account_types']['Row']['account_type'];

// Roles disponibles para registro (sin Admin) - Ver docs/SISTEMA-ROLES.md
export const REGISTER_ROLES: Exclude<AccountType, 'Admin'>[] = [
  'Coordinador',
  'Colaborador',
  'Encargado',
  'Docente',
  'Estudiante',
  'Beneficiario',
];
