"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function logout() {
    fetch("/api/admin/auth", { method: "DELETE" }).then(() => {
      window.location.href = "/admin/login";
    });
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <Link href="/admin/dashboard" className="admin-nav-logo">⚡ ClienteZero</Link>
        <Link href="/admin/dashboard" className={pathname === "/admin/dashboard" ? "active" : ""}>Dashboard</Link>
        <Link href="/admin/clientes" className={pathname.startsWith("/admin/clientes") ? "active" : ""}>Clientes</Link>
        <Link href="/admin/faturas" className={pathname.startsWith("/admin/faturas") ? "active" : ""}>Faturas</Link>
        <Link href="/admin/planos" className={pathname.startsWith("/admin/planos") ? "active" : ""}>Planos</Link>
        <Link href="/admin/servidores" className={pathname.startsWith("/admin/servidores") ? "active" : ""}>Servidores</Link>
        <Link href="/admin/produtos" className={pathname.startsWith("/admin/produtos") ? "active" : ""}>Produtos</Link>
        <Link href="/admin/conciliacao" className={pathname.startsWith("/admin/conciliacao") ? "active" : ""}>Conciliação</Link>
        <Link href="/admin/logs" className={pathname.startsWith("/admin/logs") ? "active" : ""}>Logs</Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", fontSize: "0.8rem", padding: "0.5rem 0.75rem",
            textAlign: "left", width: "100%",
          }}
        >
          Sair
        </button>
      </nav>
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
}
