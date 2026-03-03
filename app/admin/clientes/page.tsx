import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const sql = getDb();
  const pageNum = Math.max(1, Number(page));
  const limit = 20;
  const offset = (pageNum - 1) * limit;

  const rows = await sql<{
    id: number; nome: string; tel: string; ativo: boolean;
    plano_nome: string | null; data_vencimento: string | null; faturas_pendentes: number;
  }[]>`
    SELECT
      u.id, u.nome, u.tel, u.ativo,
      p.nome AS plano_nome,
      u.data_vencimento,
      (SELECT COUNT(*) FROM fatura f WHERE f.id_user = u.id AND f.situ = 0)::int AS faturas_pendentes
    FROM app_user u
    LEFT JOIN plano p ON p.id = u.plano_id
    WHERE (${q} = '' OR u.nome ILIKE ${'%' + q + '%'} OR u.tel ILIKE ${'%' + q + '%'})
    ORDER BY u.ativo DESC, u.nome ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM app_user
    WHERE (${q} = '' OR nome ILIKE ${'%' + q + '%'} OR tel ILIKE ${'%' + q + '%'})
  `;

  const pages = Math.ceil(total / limit);

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Clientes</h1>
        <Link href="/admin/clientes/novo" className="btn btn-primary">+ Novo cliente</Link>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <form method="GET" style={{ display: "flex", gap: "0.5rem" }}>
          <input
            name="q"
            defaultValue={q}
            className="form-input"
            placeholder="Buscar por nome ou telefone..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Buscar</button>
          {q && <Link href="/admin/clientes" className="btn">Limpar</Link>}
        </form>
      </div>

      <div className="card">
        <div className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          {total} cliente{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Plano</th>
              <th>Vencimento</th>
              <th>Pendentes</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="muted">Nenhum cliente encontrado.</td></tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>
                <td>{r.nome}</td>
                <td>{r.tel}</td>
                <td>{r.plano_nome ?? <span className="muted">—</span>}</td>
                <td>
                  {r.data_vencimento
                    ? new Date(r.data_vencimento).toLocaleDateString("pt-BR")
                    : <span className="muted">—</span>}
                </td>
                <td>
                  {r.faturas_pendentes > 0
                    ? <span className="badge error">{r.faturas_pendentes}</span>
                    : <span className="muted">0</span>}
                </td>
                <td>
                  <span className={`badge ${r.ativo ? "success" : "error"}`}>
                    {r.ativo ? "ativo" : "inativo"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/clientes/${r.id}`} style={{ fontSize: "0.85rem" }}>Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
            {pageNum > 1 && (
              <Link href={`/admin/clientes?q=${q}&page=${pageNum - 1}`} className="btn btn-sm">← Anterior</Link>
            )}
            <span className="muted" style={{ lineHeight: "2rem" }}>{pageNum} / {pages}</span>
            {pageNum < pages && (
              <Link href={`/admin/clientes?q=${q}&page=${pageNum + 1}`} className="btn btn-sm">Próxima →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
