"use client";

import { useState } from "react";

export default function ClienteActions({ idUser, nomeCliente }: { idUser: number; nomeCliente: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function resend() {
    setLoading("resend");
    setMsg("");
    const res = await fetch(`/api/admin/resend/${idUser}`, { method: "POST" });
    setMsg(res.ok ? "WhatsApp enviado com sucesso!" : "Erro ao enviar. Verifique a Evolution API.");
    setLoading(null);
  }

  async function toggleSuspend(suspend: boolean) {
    setLoading("suspend");
    setMsg("");
    const res = await fetch(`/api/admin/clientes/${idUser}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !suspend }),
    });
    if (res.ok) {
      setMsg(suspend ? "Cliente suspenso." : "Cliente reativado.");
      setTimeout(() => window.location.reload(), 1000);
    }
    setLoading(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <button
        className="btn btn-primary"
        onClick={resend}
        disabled={!!loading}
      >
        {loading === "resend" ? "Enviando..." : "Reenviar credenciais (WA)"}
      </button>

      <button
        className="btn btn-danger"
        onClick={() => {
          if (confirm(`Suspender acesso de ${nomeCliente}?`)) toggleSuspend(true);
        }}
        disabled={!!loading}
      >
        Suspender acesso
      </button>

      <button
        className="btn"
        onClick={() => {
          if (confirm(`Reativar acesso de ${nomeCliente}?`)) toggleSuspend(false);
        }}
        disabled={!!loading}
      >
        Reativar acesso
      </button>

      {msg && <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ok)" }}>{msg}</p>}
    </div>
  );
}
