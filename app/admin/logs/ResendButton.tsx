"use client";

import { useState } from "react";

export default function ResendButton({ idUser }: { idUser: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function resend() {
    setState("loading");
    const res = await fetch(`/api/admin/resend/${idUser}`, { method: "POST" });
    setState(res.ok ? "done" : "error");
    setTimeout(() => setState("idle"), 3000);
  }

  if (state === "done") return <span style={{ color: "var(--ok)", fontSize: "0.8rem" }}>Enviado!</span>;
  if (state === "error") return <span style={{ color: "var(--error)", fontSize: "0.8rem" }}>Erro</span>;

  return (
    <button
      onClick={resend}
      disabled={state === "loading"}
      className="btn btn-sm"
      title="Reenviar credenciais por WhatsApp"
    >
      {state === "loading" ? "..." : "Reenviar WA"}
    </button>
  );
}
