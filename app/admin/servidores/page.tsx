import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServidoresPage() {
  const sql = getDb();
  const servidores = await sql<{
    id: number; nome: string; url_base: string; protocolo: string;
    porta: number | null; max_conexoes: number | null; ativo: boolean; qtd_planos: number;
  }[]>`
    SELECT
      s.id, s.nome, s.url_base, s.protocolo, s.porta, s.max_conexoes, s.ativo,
      COUNT(p.id)::int AS qtd_planos
    FROM servidor s
    LEFT JOIN plano p ON p.servidor_id = s.id AND p.ativo = true
    GROUP BY s.id
    ORDER BY s.ativo DESC, s.nome ASC
  `;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Servidores</h1>
        <Link href="/admin/servidores/novo" className="btn btn-primary">+ Novo servidor</Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>URL</th>
              <th>Protocolo</th>
              <th>Porta</th>
              <th>Max. conexões</th>
              <th>Planos</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {servidores.length === 0 ? (
              <tr><td colSpan={9} className="muted">Nenhum servidor cadastrado.</td></tr>
            ) : null}
            {servidores.map((s) => (
              <tr key={s.id}>
                <td className="muted">{s.id}</td>
                <td>{s.nome}</td>
                <td style={{ fontSize: "0.8rem" }}>{s.url_base}</td>
                <td>{s.protocolo}</td>
                <td>{s.porta ?? <span className="muted">—</span>}</td>
                <td>{s.max_conexoes ?? <span className="muted">—</span>}</td>
                <td>{s.qtd_planos}</td>
                <td>
                  <span className={`badge ${s.ativo ? "success" : "error"}`}>
                    {s.ativo ? "ativo" : "inativo"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/servidores/${s.id}`} style={{ fontSize: "0.85rem" }}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
