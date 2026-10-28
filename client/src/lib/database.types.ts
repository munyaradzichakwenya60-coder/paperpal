// Hand-written types matching the SQL schema in supabase/migrations/001_init.sql.
// Run `npx supabase gen types typescript` to regenerate after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          school_name: string;
          teacher_name: string;
          role: "Teacher" | "Head of Department" | "Examiner";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          school_name: string;
          teacher_name: string;
          role: "Teacher" | "Head of Department" | "Examiner";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_name?: string;
          teacher_name?: string;
          role?: "Teacher" | "Head of Department" | "Examiner";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      papers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subject: string;
          level: string;
          total_marks: number;
          duration_minutes: number;
          paper_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          subject: string;
          level: string;
          total_marks: number;
          duration_minutes: number;
          paper_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subject?: string;
          level?: string;
          total_marks?: number;
          duration_minutes?: number;
          paper_json?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
