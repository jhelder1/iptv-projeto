import { NextRequest, NextResponse } from "next/server";

import { insertAutomationLog } from "@/lib/automation-log";
import { getDb } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/evolution";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();

  // Faturas vencidas há mais de 3 dias, ainda pendentes
  const inadimplentes = await sql<{
    id_fatura: number;
    id_user: number;
    nome: string;
    tel: string;
    vencimento: string;
    dias_atraso: number;
  }[]>`
    SELECT
      f.id AS id_fatura,
      u.id AS id_user,
      u.nome,
      u.tel,
      f.vencimento,
      EXTRACT(DAY FROM now() - f.vencimento)::int AS dias_atraso
    FROM fatura f
    JOIN app_user u ON u.id = f.id_user
    WHERE f.situ = 0
      AND f.vencimento < now() - INTERVAL '3 days'
      AND u.ativo = true
    ORDER BY dias_atraso DESC
  `;

  const results = { avisos: 0, suspensos: 0 };

  for (const row of inadimplentes) {
    try {
      if (row.dias_atraso >= 7) {
        // 7+ dias → suspender acesso
        await sql`UPDATE acesso SET ativo = false WHERE id_user = ${row.id_user}`;

        if (row.tel) {
          await sendWhatsAppText({
            number: row.tel,
            text: `Ola, ${row.nome?.trim() || "cliente"}. Seu acesso foi SUSPENSO por falta de pagamento (${row.dias_atraso} dias em atraso). Regularize para reativar.\n- Cine Play TV`,
          }).catch(() => { /* no-op */ });
        }

        await insertAutomationLog({
          id_user: row.id_user,
          id_fatura: row.id_fatura,
          status: "error",
          erro: `acesso_suspenso_${row.dias_atraso}d_atraso`,
          whatsapp_enviado: !!row.tel,
        });

        results.suspensos++;
      } else {
        // 3–6 dias → aviso amigável
        if (row.tel) {
          await sendWhatsAppText({
            number: row.tel,
            text: `Ola, ${row.nome?.trim() || "cliente"}. Sua fatura esta ${row.dias_atraso} dias em atraso. Evite a suspensao do servico regularizando o pagamento.\n- Cine Play TV`,
          }).catch(() => { /* no-op */ });
        }

        results.avisos++;
      }
    } catch { /* continua */ }
  }

  return NextResponse.json({ ok: true, inadimplentes: inadimplentes.length, ...results });
}
