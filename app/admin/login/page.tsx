"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin/dashboard";

  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError("Token inválido. Verifique o ADMIN_TOKEN no .env.");
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 400, margin: "6rem auto", padding: "0 1rem" }}>
      <div className="card">
        <h1 className="title" style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>ClienteZero</h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>Painel Administrativo</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="token">Token de acesso</label>
            <input
              id="token"
              type="password"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o ADMIN_TOKEN aqui"
              autoFocus
              required
            />
          </div>

          {error && (
            <p style={{ color: "var(--error)", fontSize: "0.875rem", margin: "0.5rem 0" }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
