"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Plano = { id: number; nome: string; valor: number; dias_vigencia: number; ativo: boolean };
type Produto = { id: number; nome: string; descricao: string | null; valor_adicional: number; ativo: boolean };

export default function NovoClientePage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/planos").then((r) => r.json()),
      fetch("/api/admin/produtos").then((r) => r.json()),
    ]).then(([p, prod]) => {
      setPlanos(p);
      setProdutos(prod.filter((x: Produto) => x.ativo));
    });
  }, []);

  function toggleProduto(id: number) {
    setProdutosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const plano_id = fd.get("plano_id") ? Number(fd.get("plano_id")) : null;
    const planoSel = planos.find((p) => p.id === plano_id);
    const data_vencimento = planoSel
      ? new Date(Date.now() + planoSel.dias_vigencia * 86400000).toISOString().split("T")[0]
      : null;

    const res = await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        tel: fd.get("tel"),
        email: fd.get("email") || null,
        plano_id,
        data_vencimento,
        dados_acesso: fd.get("dados_acesso"),
      }),
    });

    if (!res.ok) {
      setError("Erro ao criar cliente. Verifique os dados.");
      setLoading(false);
      return;
    }

    const { id } = await res.json();

    // Associar produtos selecionados
    await Promise.all(
      produtosSelecionados.map((id_produto) =>
        fetch(`/api/admin/clientes/${id}/produtos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_produto }),
        })
      )
    );

    router.push(`/admin/clientes/${id}`);
  }

  return (
    <main>
      <h1 className="title">Novo cliente</h1>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="grid">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input name="nome" className="form-input" required placeholder="João Silva" />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone (WhatsApp) *</label>
              <input name="tel" className="form-input" required placeholder="5535999999999" />
            </div>
          </div>

          <div className="grid">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" placeholder="joao@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Plano</label>
              <select name="plano_id" className="form-select">
                <option value="">Sem plano</option>
                {planos.filter((p) => p.ativo !== false).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — R$ {Number(p.valor).toFixed(2)} / {p.dias_vigencia}d
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dados de acesso IPTV *</label>
            <textarea
              name="dados_acesso"
              className="form-input"
              required
              rows={5}
              placeholder="Servidor: ...\nUsuário: ...\nSenha: ..."
              style={{ resize: "vertical", fontFamily: "monospace" }}
            />
          </div>

          {produtos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Produtos / Add-ons</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
                {produtos.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.4rem 0.75rem", border: "1px solid var(--border)",
                      borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem",
                      background: produtosSelecionados.includes(p.id) ? "var(--surface-alt)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={produtosSelecionados.includes(p.id)}
                      onChange={() => toggleProduto(p.id)}
                    />
                    {p.nome}
                    {Number(p.valor_adicional) > 0 && (
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        +R${Number(p.valor_adicional).toFixed(2)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ color: "var(--error)", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Criar cliente"}
            </button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}
