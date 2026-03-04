"use client";

import { useEffect, useState } from "react";

type ProdutoCliente = { id: number; nome: string; descricao: string | null; valor_adicional: number };
type ProdutoDisponivel = { id: number; nome: string; valor_adicional: number; ativo: boolean };

export default function ProdutosSection({ idUser }: { idUser: number }) {
  const [produtos, setProdutos] = useState<ProdutoCliente[]>([]);
  const [disponiveis, setDisponiveis] = useState<ProdutoDisponivel[]>([]);
  const [selecionado, setSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const [atuais, todos] = await Promise.all([
      fetch(`/api/admin/clientes/${idUser}/produtos`).then((r) => r.json()),
      fetch("/api/admin/produtos").then((r) => r.json()),
    ]);
    setProdutos(atuais);
    const idsAtuais = new Set(atuais.map((p: ProdutoCliente) => p.id));
    setDisponiveis(todos.filter((p: ProdutoDisponivel) => p.ativo && !idsAtuais.has(p.id)));
  }

  useEffect(() => { carregar(); }, [idUser]);

  async function adicionar() {
    if (!selecionado) return;
    setLoading(true);
    await fetch(`/api/admin/clientes/${idUser}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_produto: Number(selecionado) }),
    });
    setSelecionado("");
    await carregar();
    setLoading(false);
  }

  async function remover(id_produto: number) {
    if (!confirm("Remover este produto do cliente?")) return;
    await fetch(`/api/admin/clientes/${idUser}/produtos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_produto }),
    });
    await carregar();
  }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Produtos / Add-ons</h2>

      {produtos.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.875rem", margin: "0 0 0.75rem" }}>Nenhum produto contratado.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {produtos.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.35rem 0.65rem", background: "var(--surface-alt)",
                border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.875rem",
              }}
            >
              <span>{p.nome}</span>
              {Number(p.valor_adicional) > 0 && (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  +R${Number(p.valor_adicional).toFixed(2)}
                </span>
              )}
              <button
                onClick={() => remover(p.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--error)", fontSize: "0.9rem", padding: "0 0.1rem", lineHeight: 1,
                }}
                title="Remover"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {disponiveis.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            value={selecionado}
            onChange={(e) => setSelecionado(e.target.value)}
            className="form-select"
            style={{ flex: 1 }}
          >
            <option value="">+ Adicionar produto...</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}{Number(p.valor_adicional) > 0 ? ` (+R$${Number(p.valor_adicional).toFixed(2)})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={adicionar}
            disabled={!selecionado || loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? "..." : "Adicionar"}
          </button>
        </div>
      )}
    </div>
  );
}
