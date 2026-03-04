"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NovoServidorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const porta = fd.get("porta");
    const max_conexoes = fd.get("max_conexoes");
    const body = {
      nome: fd.get("nome") as string,
      url_base: fd.get("url_base") as string,
      usuario_painel: fd.get("usuario_painel") as string || undefined,
      senha_painel: fd.get("senha_painel") as string || undefined,
      porta: porta ? Number(porta) : null,
      protocolo: fd.get("protocolo") as string,
      max_conexoes: max_conexoes ? Number(max_conexoes) : null,
      notas: fd.get("notas") as string || undefined,
      ativo: fd.get("ativo") === "true",
    };
    const resp = await fetch("/api/admin/servidores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/servidores");
    } else {
      const d = await resp.json();
      setError(d.error ?? "Erro ao salvar servidor");
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 className="title">Novo Servidor</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Nome do servidor *</label>
            <input name="nome" className="form-input" required placeholder="Ex: Servidor BR-1" />
          </div>
          <div className="form-group">
            <label className="form-label">URL base *</label>
            <input name="url_base" className="form-input" required placeholder="http://192.168.0.1" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">Protocolo</label>
              <select name="protocolo" className="form-select">
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Porta</label>
              <input name="porta" type="number" min="1" max="65535" className="form-input" placeholder="8080" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">Usuário do painel</label>
              <input name="usuario_painel" className="form-input" placeholder="admin" />
            </div>
            <div className="form-group">
              <label className="form-label">Senha do painel</label>
              <input name="senha_painel" type="password" className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Máximo de conexões</label>
            <input name="max_conexoes" type="number" min="1" className="form-input" placeholder="100" />
          </div>
          <div className="form-group">
            <label className="form-label">Notas internas</label>
            <textarea name="notas" className="form-input" rows={3} placeholder="Observações sobre este servidor..." style={{ resize: "vertical" }} />
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
              {loading ? "Salvando..." : "Criar servidor"}
            </button>
            <button type="button" className="btn" onClick={() => router.back()}>Cancelar</button>
          </div>
        </form>
      </div>
    </main>
  );
}
