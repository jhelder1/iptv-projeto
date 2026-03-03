export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      acesso: {
        Row: {
          id: number;
          id_user: number;
          dados: string;
        };
        Insert: {
          id?: number;
          id_user: number;
          dados: string;
        };
        Update: {
          id?: number;
          id_user?: number;
          dados?: string;
        };
        Relationships: [];
      };
      app_user: {
        Row: {
          id: number;
          nome: string;
          tel: string;
          email: string | null;
        };
        Insert: {
          id?: number;
          nome: string;
          tel: string;
          email?: string | null;
        };
        Update: {
          id?: number;
          nome?: string;
          tel?: string;
          email?: string | null;
        };
        Relationships: [];
      };
      automation_log: {
        Row: {
          id: number;
          id_user: number;
          id_fatura: number | null;
          mp_payment_id: string | null;
          status: "success" | "error";
          erro: string | null;
          whatsapp_enviado: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          id_user: number;
          id_fatura?: number | null;
          mp_payment_id?: string | null;
          status: "success" | "error";
          erro?: string | null;
          whatsapp_enviado?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          id_user?: number;
          id_fatura?: number | null;
          mp_payment_id?: string | null;
          status?: "success" | "error";
          erro?: string | null;
          whatsapp_enviado?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      fatura: {
        Row: {
          id: number;
          id_user: number;
          situ: number;
          valor: number | null;
          forma: string | null;
          vencimento: string | null;
        };
        Insert: {
          id?: number;
          id_user: number;
          situ?: number;
          valor?: number | null;
          forma?: string | null;
          vencimento?: string | null;
        };
        Update: {
          id?: number;
          id_user?: number;
          situ?: number;
          valor?: number | null;
          forma?: string | null;
          vencimento?: string | null;
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
