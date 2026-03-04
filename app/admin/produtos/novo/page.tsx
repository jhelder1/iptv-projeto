"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NovoProdutoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string || undefined,
      valor_adicional: Number(fd.get("valor_adicional")),
      ativo: fd.get("ativo") === "true",
    };
    const resp = await fetch("/api/admin/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/produtos");
    } else {
      const d = await resp.json();
      setError(d.error ?? "Erro ao salvar produto");
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 className="title">Novo Produto / Add-on</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Nome do produto *</label>
            <input name="nome" className="form-input" required placeholder="Ex: 2 Telas, VOD, Esportes" />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea name="descricao" className="form-input" rows={2} placeholder="Descrição opcional..." style={{ resize: "vertical" }} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor adicional (R$)</label>
            <input name="valor_adicional" type="number" step="0.01" min="0" defaultValue={0} className="form-input" />
            <span className="muted" style={{ fontSize: "0.8rem" }}>Use 0 para itens inclusos no plano</span>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="ativo" className="form-select">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Criar produto"}
            </button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}
