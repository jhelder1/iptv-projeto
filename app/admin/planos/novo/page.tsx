"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Servidor = { id: number; nome: string; ativo: boolean };

export default function NovoPlanoPage() {
  const router = useRouter();
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/servidores")
      .then((r) => r.json())
      .then((d) => setServidores(d.filter((s: Servidor) => s.ativo)));
  }, []);

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
    const resp = await fetch("/api/admin/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/planos");
    } else {
      const d = await resp.json();
      setError(d.error ?? "Erro ao salvar plano");
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 className="title">Novo Plano</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Nome do plano *</label>
            <input name="nome" className="form-input" required placeholder="Ex: Básico 1 Tela" />
          </div>
          <div className="form-group">
            <label className="form-label">Valor mensal (R$) *</label>
            <input name="valor" type="number" step="0.01" min="0" className="form-input" required placeholder="49.90" />
          </div>
          <div className="form-group">
            <label className="form-label">Dias de vigência *</label>
            <input name="dias_vigencia" type="number" min="1" defaultValue={30} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Servidor</label>
            <select name="servidor_id" className="form-select">
              <option value="">— Sem servidor —</option>
              {servidores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
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
              {loading ? "Salvando..." : "Criar plano"}
            </button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}
