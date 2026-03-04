import Link from "next/link";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const sql = getDb();
  const produtos = await sql<{
    id: number; nome: string; descricao: string | null;
    valor_adicional: number; ativo: boolean;
  }[]>`
    SELECT id, nome, descricao, valor_adicional::numeric AS valor_adicional, ativo
    FROM produto
    ORDER BY ativo DESC, nome ASC
  `;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Produtos / Add-ons</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Valor adicional</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr><td colSpan={6} className="muted">Nenhum produto cadastrado.</td></tr>
            ) : null}
            {produtos.map((p) => (
              <tr key={p.id}>
                <td className="muted">{p.id}</td>
                <td>{p.nome}</td>
                <td className="muted" style={{ fontSize: "0.85rem" }}>{p.descricao ?? "—"}</td>
                <td>
                  {Number(p.valor_adicional) > 0
                    ? `+${Number(p.valor_adicional).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                    : <span className="muted">Incluso</span>}
                </td>
                <td>
                  <span className={`badge ${p.ativo ? "success" : "error"}`}>
                    {p.ativo ? "ativo" : "inativo"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/produtos/${p.id}`} style={{ fontSize: "0.85rem" }}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
