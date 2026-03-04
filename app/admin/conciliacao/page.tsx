import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Divergencia = {
  id_fatura: number; id_user: number; nome: string; tel: string;
  valor_db: number; mp_payment_id: string;
  status_mp: string | null; valor_mp: number | null;
  divergente: boolean; motivo: string | null;
};

async function getRelatorio(dias: number) {
  const sql = getDb();

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

  return resumo;
}

async function getDivergencias(dias: number): Promise<Divergencia[]> {
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) return [];

  const sql = getDb();
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

  const divergencias: Divergencia[] = [];
  for (const f of faturasPagas) {
    let status_mp: string | null = null;
    let valor_mp: number | null = null;
    let divergente = false;
    let motivo: string | null = null;

    try {
      const resp = await fetch(
        `https://api.mercadopago.com/v1/payments/${f.mp_payment_id}`,
        { headers: { Authorization: `Bearer ${mpToken}` }, cache: "no-store" }
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
          motivo = `Valor DB: R$${Number(f.valor).toFixed(2)} × MP: R$${valor_mp.toFixed(2)}`;
        }
      } else {
        divergente = true;
        motivo = `MP retornou HTTP ${resp.status}`;
      }
    } catch {
      motivo = "Erro ao consultar MP";
    }

    divergencias.push({
      id_fatura: f.id, id_user: f.id_user, nome: f.nome, tel: f.tel,
      valor_db: Number(f.valor), mp_payment_id: f.mp_payment_id,
      status_mp, valor_mp, divergente, motivo,
    });
  }

  return divergencias;
}

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: diasStr = "30" } = await searchParams;
  const dias = Number(diasStr);

  const [resumo, divergencias] = await Promise.all([
    getRelatorio(dias),
    getDivergencias(dias),
  ]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalDivergentes = divergencias.filter((d) => d.divergente).length;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Conciliação Bancária</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[30, 60, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/conciliacao?dias=${d}`}
              className={`btn btn-sm ${dias === d ? "btn-primary" : ""}`}
            >
              {d} dias
            </Link>
          ))}
        </div>
      </div>

      <div className="grid" style={{ marginBottom: "1rem" }}>
        <div className="stat-card stat-card--ok">
          <div className="stat-label">Recebido ({dias} dias)</div>
          <div className="stat-value">{fmt(resumo.recebido)}</div>
        </div>
        <div className="stat-card stat-card--warn">
          <div className="stat-label">Pendente ({dias} dias)</div>
          <div className="stat-value">{fmt(resumo.pendente)}</div>
        </div>
        <div className="stat-card stat-card--error">
          <div className="stat-label">Cancelado ({dias} dias)</div>
          <div className="stat-value">{fmt(resumo.cancelado)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total de faturas</div>
          <div className="stat-value">{resumo.qtd_total}</div>
        </div>
        <div className={`stat-card ${totalDivergentes > 0 ? "stat-card--error" : "stat-card--ok"}`}>
          <div className="stat-label">Divergências MP</div>
          <div className="stat-value">{totalDivergentes}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Verificação Mercado Pago × Banco</h2>
          <p className="muted" style={{ fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Faturas pagas nos últimos {dias} dias com ID de pagamento MP. Máximo 50 por vez.
          </p>
        </div>
        {divergencias.length === 0 ? (
          <p className="muted">
            {process.env.MP_ACCESS_TOKEN
              ? "Nenhuma fatura paga com MP payment ID no período."
              : "MP_ACCESS_TOKEN não configurado — conciliação indisponível."}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fatura</th>
                <th>Cliente</th>
                <th>Valor DB</th>
                <th>MP Payment ID</th>
                <th>Status MP</th>
                <th>Valor MP</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {divergencias.map((d) => (
                <tr key={d.id_fatura}>
                  <td className="muted">{d.id_fatura}</td>
                  <td>
                    <Link href={`/admin/clientes/${d.id_user}`}>{d.nome}</Link>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>{d.tel}</div>
                  </td>
                  <td>{fmt(d.valor_db)}</td>
                  <td style={{ fontSize: "0.75rem" }}>{d.mp_payment_id}</td>
                  <td>{d.status_mp ?? <span className="muted">—</span>}</td>
                  <td>{d.valor_mp != null ? fmt(d.valor_mp) : <span className="muted">—</span>}</td>
                  <td>
                    {d.divergente ? (
                      <div>
                        <span className="badge error">DIVERGÊNCIA</span>
                        {d.motivo && <div className="muted" style={{ fontSize: "0.75rem" }}>{d.motivo}</div>}
                      </div>
                    ) : (
                      <span className="badge success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
