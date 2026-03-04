"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Servidor = {
  id: number; nome: string; url_base: string; usuario_painel: string | null;
  porta: number | null; protocolo: string; max_conexoes: number | null;
  ativo: boolean; notas: string | null;
  planos: { id: number; nome: string; valor: number; dias_vigencia: number; ativo: boolean }[];
};

export default function EditarServidorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/servidores/${id}`).then((r) => r.json()).then(setServidor);
  }, [id]);

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
      usuario_painel: fd.get("usuario_painel") as string || null,
      senha_painel: fd.get("senha_painel") as string || null,
      porta: porta ? Number(porta) : null,
      protocolo: fd.get("protocolo") as string,
      max_conexoes: max_conexoes ? Number(max_conexoes) : null,
      notas: fd.get("notas") as string || null,
      ativo: fd.get("ativo") === "true",
    };
    const resp = await fetch(`/api/admin/servidores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      router.push("/admin/servidores");
    } else {
      setError("Erro ao salvar");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Desativar este servidor?")) return;
    await fetch(`/api/admin/servidores/${id}`, { method: "DELETE" });
    router.push("/admin/servidores");
  }

  if (!servidor) return <main><p className="muted">Carregando...</p></main>;

  return (
    <main>
      <h1 className="title">Editar Servidor #{id}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>
        <div className="card">
          {error && <div className="badge error" style={{ marginBottom: "1rem", display: "block" }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input name="nome" className="form-input" required defaultValue={servidor.nome} />
            </div>
            <div className="form-group">
              <label className="form-label">URL base *</label>
              <input name="url_base" className="form-input" required defaultValue={servidor.url_base} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Protocolo</label>
                <select name="protocolo" className="form-select" defaultValue={servidor.protocolo}>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Porta</label>
                <input name="porta" type="number" className="form-input" defaultValue={servidor.porta ?? ""} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Usuário painel</label>
                <input name="usuario_painel" className="form-input" defaultValue={servidor.usuario_painel ?? ""} />
              </div>
              <div className="form-group">
                <label className="form-label">Senha painel</label>
                <input name="senha_painel" type="password" className="form-input" placeholder="(sem alteração)" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Máx. conexões</label>
              <input name="max_conexoes" type="number" className="form-input" defaultValue={servidor.max_conexoes ?? ""} />
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea name="notas" className="form-input" rows={3} defaultValue={servidor.notas ?? ""} style={{ resize: "vertical" }} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="ativo" className="form-select" defaultValue={servidor.ativo ? "true" : "false"}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Desativar</button>
              <button type="button" className="btn" onClick={() => router.back()}>Voltar</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Planos deste servidor</h2>
            <Link href="/admin/planos/novo" className="btn btn-sm btn-primary">+ Novo plano</Link>
          </div>
          {servidor.planos.length === 0 ? (
            <p className="muted">Nenhum plano vinculado ainda.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Nome</th><th>Valor</th><th>Dias</th><th>Status</th></tr>
              </thead>
              <tbody>
                {servidor.planos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td>{p.dias_vigencia}</td>
                    <td>
                      <span className={`badge ${p.ativo ? "success" : "error"}`}>
                        {p.ativo ? "ativo" : "inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
