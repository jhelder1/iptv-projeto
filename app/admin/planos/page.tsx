import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const sql = getDb();
  const planos = await sql<{
    id: number; nome: string; valor: number; dias_vigencia: number;
    ativo: boolean; servidor_nome: string | null; servidor_id: number | null;
  }[]>`
    SELECT p.id, p.nome, p.valor::numeric AS valor, p.dias_vigencia, p.ativo,
           p.servidor_id, s.nome AS servidor_nome
    FROM plano p
    LEFT JOIN servidor s ON s.id = p.servidor_id
    ORDER BY p.ativo DESC, p.nome ASC
  `;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Planos</h1>
        <Link href="/admin/planos/novo" className="btn btn-primary">+ Novo plano</Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Valor</th>
              <th>Vigência</th>
              <th>Servidor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {planos.length === 0 ? (
              <tr><td colSpan={7} className="muted">Nenhum plano cadastrado.</td></tr>
            ) : null}
            {planos.map((p) => (
              <tr key={p.id}>
                <td className="muted">{p.id}</td>
                <td>{p.nome}</td>
                <td>
                  {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td>{p.dias_vigencia} dias</td>
                <td>{p.servidor_nome ?? <span className="muted">—</span>}</td>
                <td>
                  <span className={`badge ${p.ativo ? "success" : "error"}`}>
                    {p.ativo ? "ativo" : "inativo"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/planos/${p.id}`} style={{ fontSize: "0.85rem" }}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
