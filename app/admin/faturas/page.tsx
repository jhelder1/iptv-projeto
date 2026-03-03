import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const SITU_LABEL: Record<number, string> = { 0: "pendente", 1: "pago", 2: "cancelada" };
const SITU_CLASS: Record<number, string> = { 0: "error", 1: "success", 2: "" };

export default async function FaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ situ?: string; id_user?: string; page?: string }>;
}) {
  const { situ, id_user, page = "1" } = await searchParams;
  const sql = getDb();
  const pageNum = Math.max(1, Number(page));
  const limit = 30;
  const offset = (pageNum - 1) * limit;

  const rows = await sql<{
    id: number; id_user: number; nome: string;
    situ: number; valor: number; vencimento: string | null;
    data_pagamento: string | null; mp_payment_id: string | null;
  }[]>`
    SELECT
      f.id, f.id_user, u.nome,
      f.situ, f.valor, f.vencimento, f.data_pagamento, f.mp_payment_id
    FROM fatura f
    JOIN app_user u ON u.id = f.id_user
    WHERE (${situ ?? null} IS NULL OR f.situ = ${situ ? Number(situ) : null})
      AND (${id_user ?? null} IS NULL OR f.id_user = ${id_user ? Number(id_user) : null})
    ORDER BY f.vencimento DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM fatura f
    WHERE (${situ ?? null} IS NULL OR f.situ = ${situ ? Number(situ) : null})
      AND (${id_user ?? null} IS NULL OR f.id_user = ${id_user ? Number(id_user) : null})
  `;

  const pages = Math.ceil(total / limit);

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Faturas</h1>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <form method="GET" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select name="situ" defaultValue={situ ?? ""} className="form-select" style={{ width: "auto" }}>
            <option value="">Todos os status</option>
            <option value="0">Pendente</option>
            <option value="1">Pago</option>
            <option value="2">Cancelada</option>
          </select>
          <input name="id_user" defaultValue={id_user ?? ""} className="form-input" placeholder="ID do cliente" style={{ width: 140 }} />
          <button type="submit" className="btn btn-primary">Filtrar</button>
          <Link href="/admin/faturas" className="btn">Limpar</Link>
        </form>
      </div>

      <div className="card">
        <div className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          {total} fatura{total !== 1 ? "s" : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th>MP ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="muted">Nenhuma fatura encontrada.</td></tr>
            ) : null}
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="muted">{f.id}</td>
                <td>
                  <Link href={`/admin/clientes/${f.id_user}`}>{f.nome}</Link>
                </td>
                <td>R$ {Number(f.valor).toFixed(2)}</td>
                <td>{f.vencimento ? new Date(f.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                <td>{f.data_pagamento ? new Date(f.data_pagamento).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="muted" style={{ fontSize: "0.8rem" }}>{f.mp_payment_id ?? "—"}</td>
                <td>
                  <span className={`badge ${SITU_CLASS[f.situ] ?? ""}`}>
                    {SITU_LABEL[f.situ] ?? f.situ}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
            {pageNum > 1 && (
              <Link href={`/admin/faturas?situ=${situ ?? ""}&page=${pageNum - 1}`} className="btn btn-sm">← Anterior</Link>
            )}
            <span className="muted" style={{ lineHeight: "2rem" }}>{pageNum} / {pages}</span>
            {pageNum < pages && (
              <Link href={`/admin/faturas?situ=${situ ?? ""}&page=${pageNum + 1}`} className="btn btn-sm">Próxima →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
