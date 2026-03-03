import Link from "next/link";

import { getDb } from "@/lib/db";
import ClienteActions from "./actions";

export const dynamic = "force-dynamic";

const SITU_LABEL: Record<number, string> = { 0: "pendente", 1: "pago", 2: "cancelada" };
const SITU_CLASS: Record<number, string> = { 0: "error", 1: "success", 2: "" };

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  const idNum = Number(id);

  const [user] = await sql<{
    id: number; nome: string; tel: string; email: string | null;
    ativo: boolean; plano_nome: string | null; data_vencimento: string | null;
  }[]>`
    SELECT u.id, u.nome, u.tel, u.email, u.ativo, p.nome AS plano_nome, u.data_vencimento
    FROM app_user u LEFT JOIN plano p ON p.id = u.plano_id
    WHERE u.id = ${idNum}
  `;

  if (!user) {
    return <main><p className="muted">Cliente não encontrado.</p></main>;
  }

  const [acesso] = await sql<{ dados: string; ativo: boolean }[]>`
    SELECT dados, ativo FROM acesso WHERE id_user = ${idNum} LIMIT 1
  `;

  const faturas = await sql<{
    id: number; situ: number; valor: number;
    vencimento: string | null; data_pagamento: string | null; mp_payment_id: string | null;
  }[]>`
    SELECT id, situ, valor, vencimento, data_pagamento, mp_payment_id
    FROM fatura WHERE id_user = ${idNum} ORDER BY vencimento DESC LIMIT 20
  `;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <Link href="/admin/clientes" style={{ fontSize: "0.9rem" }}>← Clientes</Link>
        <h1 className="title" style={{ margin: 0 }}>{user.nome}</h1>
        <span className={`badge ${user.ativo ? "success" : "error"}`}>{user.ativo ? "ativo" : "inativo"}</span>
      </div>

      <div className="grid" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Dados do cliente</h2>
          <table>
            <tbody>
              <tr><td className="muted" style={{ paddingRight: "1rem" }}>Telefone</td><td>{user.tel}</td></tr>
              <tr><td className="muted">Email</td><td>{user.email ?? "—"}</td></tr>
              <tr><td className="muted">Plano</td><td>{user.plano_nome ?? "—"}</td></tr>
              <tr><td className="muted">Vencimento</td><td>
                {user.data_vencimento ? new Date(user.data_vencimento).toLocaleDateString("pt-BR") : "—"}
              </td></tr>
              <tr><td className="muted">Acesso</td><td>
                <span className={`badge ${acesso?.ativo ? "success" : "error"}`}>
                  {acesso?.ativo ? "ativo" : "suspenso"}
                </span>
              </td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Ações</h2>
          <ClienteActions idUser={idNum} nomeCliente={user.nome} />
        </div>
      </div>

      {acesso?.dados && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Dados de acesso IPTV</h2>
          <pre style={{
            background: "var(--surface-alt)", borderRadius: 8, padding: "0.75rem",
            fontSize: "0.85rem", whiteSpace: "pre-wrap", margin: 0,
          }}>
            {acesso.dados}
          </pre>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem" }}>Faturas</h2>
          <Link href={`/admin/faturas?id_user=${idNum}`} style={{ fontSize: "0.85rem" }}>Ver todas</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {faturas.length === 0 ? (
              <tr><td colSpan={5} className="muted">Nenhuma fatura.</td></tr>
            ) : null}
            {faturas.map((f) => (
              <tr key={f.id}>
                <td className="muted">{f.id}</td>
                <td>R$ {Number(f.valor).toFixed(2)}</td>
                <td>{f.vencimento ? new Date(f.vencimento).toLocaleDateString("pt-BR") : "—"}</td>
                <td>{f.data_pagamento ? new Date(f.data_pagamento).toLocaleDateString("pt-BR") : "—"}</td>
                <td>
                  <span className={`badge ${SITU_CLASS[f.situ] ?? ""}`}>
                    {SITU_LABEL[f.situ] ?? f.situ}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
