import { getDb } from "@/lib/db";

export type LogPayload = {
  id_user: number;
  id_fatura?: number | null;
  mp_payment_id?: string | null;
  status: "success" | "error";
  erro?: string | null;
  whatsapp_enviado?: boolean;
};

export async function insertAutomationLog(payload: LogPayload): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO automation_log (id_user, id_fatura, mp_payment_id, status, erro, whatsapp_enviado)
    VALUES (
      ${payload.id_user},
      ${payload.id_fatura ?? null},
      ${payload.mp_payment_id ?? null},
      ${payload.status},
      ${payload.erro ?? null},
      ${payload.whatsapp_enviado ?? false}
    )
  `;
}
