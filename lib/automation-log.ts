import { getSupabaseAdmin } from "@/lib/supabase";

export type LogPayload = {
  id_user: number;
  id_fatura?: number | null;
  mp_payment_id?: string | null;
  status: "success" | "error";
  erro?: string | null;
  whatsapp_enviado?: boolean;
};

export async function insertAutomationLog(payload: LogPayload): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("automation_log").insert({
    id_user: payload.id_user,
    id_fatura: payload.id_fatura ?? null,
    mp_payment_id: payload.mp_payment_id ?? null,
    status: payload.status,
    erro: payload.erro ?? null,
    whatsapp_enviado: payload.whatsapp_enviado ?? false,
  });

  if (error) {
    throw new Error(`Failed to insert automation_log: ${error.message}`);
  }
}
