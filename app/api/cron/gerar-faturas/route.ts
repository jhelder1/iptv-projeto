import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/evolution";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();

  // Clientes ativos com plano cujo vencimento é em até 3 dias (ou já venceu sem fatura pendente)
  const clientes = await sql<{
    id: number;
    nome: string;
    tel: string;
    data_vencimento: string;
    plano_valor: number;
    plano_dias: number;
  }[]>`
    SELECT
      u.id,
      u.nome,
      u.tel,
      u.data_vencimento,
      p.valor AS plano_valor,
      p.dias_vigencia AS plano_dias
    FROM app_user u
    JOIN plano p ON p.id = u.plano_id
    WHERE u.ativo = true
      AND p.ativo = true
      AND u.data_vencimento <= CURRENT_DATE + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM fatura f
        WHERE f.id_user = u.id
          AND f.situ = 0
          AND f.vencimento > now() - INTERVAL '1 day'
      )
  `;

  let geradas = 0;

  for (const cliente of clientes) {
    try {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + cliente.plano_dias);

      await sql`
        INSERT INTO fatura (id_user, situ, valor, forma, vencimento)
        VALUES (${cliente.id}, 0, ${cliente.plano_valor}, 'pix', ${vencimento.toISOString()})
      `;

      // Atualiza data_vencimento do cliente
      await sql`
        UPDATE app_user SET data_vencimento = ${vencimento.toISOString().split("T")[0]}
        WHERE id = ${cliente.id}
      `;

      // WhatsApp com aviso de vencimento
      if (cliente.tel) {
        const valorFmt = Number(cliente.plano_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const dataFmt = vencimento.toLocaleDateString("pt-BR");
        try {
          await sendWhatsAppText({
            number: cliente.tel,
            text: `Ola, ${cliente.nome?.trim() || "cliente"}! Sua fatura de ${valorFmt} vence em ${dataFmt}. Aguarde o link de pagamento ou entre em contato.\n- Cine Play TV`,
          });
        } catch { /* no-op — WhatsApp não bloqueia geração */ }
      }

      geradas++;
    } catch { /* continua pro próximo */ }
  }

  return NextResponse.json({ ok: true, faturas_geradas: geradas, clientes_verificados: clientes.length });
}
