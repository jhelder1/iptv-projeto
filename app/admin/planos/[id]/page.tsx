"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Servidor = { id: number; nome: string; ativo: boolean };
type Plano = {
  id: number; nome: string; valor: number; dias_vigencia: number;
  ativo: boolean; servidor_id: number | null;
};

export default function EditarPlanoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [plano, setPlano] = useState<Plano | null>(null);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/planos/${id}`).then((r) => r.json()),
      fetch("/api/admin/servidores").then((r) => r.json()),
    ]).then(([p, s]) => {
      setPlano(p);
      setServidores(s);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const servidor_id = fd.get("servidor_id");
    const body = {
      nome: fd.get("nome") as string,
      valor: Number(fd.get("valor")),
      dias_vigencia: Number(fd.get("dias_vigencia")),
      ativo: fd.get("ativo") === "true",
      servidor_id: servidor_id ? Number(servidor_id) : null,
    };
    const resp = await fetch(`/api/admin/planos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/planos");
    } else {
      setError("Erro ao salvar");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Desativar este plano?")) return;
    await fetch(`/api/admin/planos/${id}`, { method: "DELETE" });
    router.push("/admin/planos");
  }

  if (!plano) return <main><p className="muted">Carregando...</p></main>;

  return (
    <main>
      <h1 className="title">Editar Plano #{id}</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Nome do plano *</label>
            <input name="nome" className="form-input" required defaultValue={plano.nome} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor mensal (R$) *</label>
            <input name="valor" type="number" step="0.01" min="0" className="form-input" required defaultValue={Number(plano.valor)} />
          </div>
          <div className="form-group">
            <label className="form-label">Dias de vigência *</label>
            <input name="dias_vigencia" type="number" min="1" className="form-input" required defaultValue={plano.dias_vigencia} />
          </div>
          <div className="form-group">
            <label className="form-label">Servidor</label>
            <select name="servidor_id" className="form-select" defaultValue={plano.servidor_id ?? ""}>
              <option value="">— Sem servidor —</option>
              {servidores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="ativo" className="form-select" defaultValue={plano.ativo ? "true" : "false"}>
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
