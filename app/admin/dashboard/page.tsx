import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const sql = getDb();

  const [{ ativos }] = await sql<{ ativos: number }[]>`
    SELECT COUNT(*)::int AS ativos FROM app_user WHERE ativo = true
  `;
  const [{ inadimplentes }] = await sql<{ inadimplentes: number }[]>`
    SELECT COUNT(DISTINCT f.id_user)::int AS inadimplentes
    FROM fatura f
    WHERE f.situ = 0 AND f.vencimento < now() - INTERVAL '3 days'
  `;
  const [{ receita_mes }] = await sql<{ receita_mes: number }[]>`
    SELECT COALESCE(SUM(valor), 0)::numeric AS receita_mes
    FROM fatura
    WHERE situ = 1 AND data_pagamento >= date_trunc('month', now())
  `;
  const [{ suspensos }] = await sql<{ suspensos: number }[]>`
    SELECT COUNT(*)::int AS suspensos FROM acesso WHERE ativo = false
  `;
  const [{ vencendo_hoje }] = await sql<{ vencendo_hoje: number }[]>`
    SELECT COUNT(*)::int AS vencendo_hoje FROM fatura
    WHERE situ = 0 AND vencimento::date = CURRENT_DATE
  `;

  const logsRecentes = await sql<{
    id: number; id_user: number; status: string; erro: string | null;
    whatsapp_enviado: boolean; created_at: string;
  }[]>`
    SELECT id, id_user, status, erro, whatsapp_enviado, created_at
    FROM automation_log
    ORDER BY created_at DESC
    LIMIT 8
  `;

  return { ativos, inadimplentes, receita_mes: Number(receita_mes), suspensos, vencendo_hoje, logsRecentes };
}

export default async function DashboardPage() {
  const m = await getMetrics();

  const receitaFmt = m.receita_mes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Dashboard</h1>
        <span className="muted" style={{ fontSize: "0.85rem" }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      <div className="grid" style={{ marginBottom: "1rem" }}>
        <div className="stat-card">
          <div className="stat-label">Clientes ativos</div>
          <div className="stat-value">{m.ativos}</div>
        </div>
        <div className="stat-card stat-card--warn">
          <div className="stat-label">Inadimplentes</div>
          <div className="stat-value">{m.inadimplentes}</div>
        </div>
        <div className="stat-card stat-card--error">
          <div className="stat-label">Acessos suspensos</div>
          <div className="stat-value">{m.suspensos}</div>
        </div>
        <div className="stat-card stat-card--ok">
          <div className="stat-label">Receita do mês</div>
          <div className="stat-value">{receitaFmt}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vencendo hoje</div>
          <div className="stat-value">{m.vencendo_hoje}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Últimas automações</h2>
          <Link href="/admin/logs" style={{ fontSize: "0.85rem" }}>Ver todos</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuário</th>
              <th>Status</th>
              <th>WA</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            {m.logsRecentes.length === 0 ? (
              <tr><td colSpan={5} className="muted">Nenhum log ainda.</td></tr>
            ) : null}
            {m.logsRecentes.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>
                  <Link href={`/admin/clientes/${l.id_user}`}>#{l.id_user}</Link>
                </td>
                <td>
                  <span className={`badge ${l.status === "success" ? "success" : "error"}`}>{l.status}</span>
                  {l.erro ? <div className="muted" style={{ fontSize: "0.75rem" }}>{l.erro}</div> : null}
                </td>
                <td>{l.whatsapp_enviado ? "✓" : "—"}</td>
                <td className="muted" style={{ fontSize: "0.8rem" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
