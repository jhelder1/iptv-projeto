"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Produto = {
  id: number; nome: string; descricao: string | null;
  valor_adicional: number; ativo: boolean;
};

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/produtos")
      .then((r) => r.json())
      .then((list: Produto[]) => {
        const p = list.find((x) => String(x.id) === id);
        if (p) setProduto(p);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      nome: fd.get("nome") as string,
      descricao: fd.get("descricao") as string || null,
      valor_adicional: Number(fd.get("valor_adicional")),
      ativo: fd.get("ativo") === "true",
    };
    const resp = await fetch(`/api/admin/produtos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/produtos");
    } else {
      setError("Erro ao salvar");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Desativar este produto?")) return;
    await fetch(`/api/admin/produtos/${id}`, { method: "DELETE" });
    router.push("/admin/produtos");
  }

  if (!produto) return <main><p className="muted">Carregando...</p></main>;

  return (
    <main>
      <h1 className="title">Editar Produto #{id}</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input name="nome" className="form-input" required defaultValue={produto.nome} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea name="descricao" className="form-input" rows={2} defaultValue={produto.descricao ?? ""} style={{ resize: "vertical" }} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor adicional (R$)</label>
            <input name="valor_adicional" type="number" step="0.01" min="0" className="form-input" defaultValue={Number(produto.valor_adicional)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="ativo" className="form-select" defaultValue={produto.ativo ? "true" : "false"}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Desativar</button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}
