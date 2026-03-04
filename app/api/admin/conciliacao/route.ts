import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const dias = Number(request.nextUrl.searchParams.get("dias") ?? "30");
  const sql = getDb();
  const env = getEnv();

  // ── Relatório do banco ───────────────────────────────────────────
  const relatorio = await sql<{ situ: number; total: number; qtd: number }[]>`
    SELECT situ, COUNT(*)::int AS qtd, COALESCE(SUM(valor), 0)::numeric AS total
    FROM fatura
    WHERE created_at >= now() - (${dias} || ' days')::interval
    GROUP BY situ
  `;

  const resumo = { recebido: 0, pendente: 0, cancelado: 0, qtd_total: 0 };
  for (const r of relatorio) {
    resumo.qtd_total += r.qtd;
    if (r.situ === 1) resumo.recebido = Number(r.total);
    if (r.situ === 0) resumo.pendente = Number(r.total);
    if (r.situ === 2) resumo.cancelado = Number(r.total);
  }

  // ── Divergências: faturas pagas com mp_payment_id → consultar MP ──
  const faturasPagas = await sql<{
    id: number; id_user: number; valor: number; mp_payment_id: string;
    nome: string; tel: string;
  }[]>`
    SELECT f.id, f.id_user, f.valor::numeric AS valor, f.mp_payment_id,
           u.nome, u.tel
    FROM fatura f
    JOIN app_user u ON u.id = f.id_user
    WHERE f.situ = 1
      AND f.mp_payment_id IS NOT NULL
      AND f.data_pagamento >= now() - (${dias} || ' days')::interval
    ORDER BY f.data_pagamento DESC
    LIMIT 50
  `;

  const divergencias: {
    id_fatura: number; id_user: number; nome: string; tel: string;
    valor_db: number; mp_payment_id: string;
    status_mp: string | null; valor_mp: number | null;
    divergente: boolean; motivo: string | null;
  }[] = [];

  for (const f of faturasPagas) {
    let status_mp: string | null = null;
    let valor_mp: number | null = null;
    let divergente = false;
    let motivo: string | null = null;

    try {
      const resp = await fetch(
        `https://api.mercadopago.com/v1/payments/${f.mp_payment_id}`,
        { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` }, next: { revalidate: 0 } }
      );
      if (resp.ok) {
        const data = await resp.json();
        status_mp = data.status as string;
        valor_mp = Number(data.transaction_amount);

        if (status_mp !== "approved") {
          divergente = true;
          motivo = `Status MP: ${status_mp} (esperado: approved)`;
        } else if (Math.abs(valor_mp - Number(f.valor)) > 0.01) {
          divergente = true;
          motivo = `Valor diverge: DB R$${Number(f.valor).toFixed(2)} × MP R$${valor_mp.toFixed(2)}`;
        }
      } else {
        divergente = true;
        motivo = `MP retornou ${resp.status} para payment_id ${f.mp_payment_id}`;
      }
    } catch {
      motivo = "Erro ao consultar MP";
    }

    divergencias.push({
      id_fatura: f.id,
      id_user: f.id_user,
      nome: f.nome,
      tel: f.tel,
      valor_db: Number(f.valor),
      mp_payment_id: f.mp_payment_id,
      status_mp,
      valor_mp,
      divergente,
      motivo,
    });
  }

  return NextResponse.json({ resumo, divergencias, dias });
}
