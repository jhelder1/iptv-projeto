import Link from "next/link";

import { getDb } from "@/lib/db";
import ResendButton from "./ResendButton";

export const dynamic = "force-dynamic";

type LogRow = {
  id: number;
  id_user: number;
  id_fatura: number | null;
  mp_payment_id: string | null;
  status: "success" | "error";
  erro: string | null;
  whatsapp_enviado: boolean;
  created_at: string;
};

async function getLogs(): Promise<LogRow[]> {
  const sql = getDb();
  return sql<LogRow[]>`
    SELECT id, id_user, id_fatura, mp_payment_id, status, erro, whatsapp_enviado, created_at
    FROM automation_log
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

export default async function LogsPage() {
  const logs = await getLogs();

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 className="title" style={{ margin: 0 }}>Logs de Automação</h1>
        <span className="muted" style={{ fontSize: "0.85rem" }}>Últimas 50 execuções</span>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Fatura</th>
              <th>MP ID</th>
              <th>Status</th>
              <th>WA</th>
              <th>Quando</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={8} className="muted">Nenhum log encontrado.</td></tr>
            ) : null}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="muted">{log.id}</td>
                <td>
                  <Link href={`/admin/clientes/${log.id_user}`}>#{log.id_user}</Link>
                </td>
                <td className="muted">{log.id_fatura ?? "—"}</td>
                <td className="muted" style={{ fontSize: "0.8rem" }}>{log.mp_payment_id ?? "—"}</td>
                <td>
                  <span className={`badge ${log.status === "success" ? "success" : "error"}`}>{log.status}</span>
                  {log.erro ? <div className="muted" style={{ fontSize: "0.75rem" }}>{log.erro}</div> : null}
                </td>
                <td>{log.whatsapp_enviado ? "✓" : "—"}</td>
                <td className="muted" style={{ fontSize: "0.8rem" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                <td>
                  {(log.status === "error" || !log.whatsapp_enviado) && (
                    <ResendButton idUser={log.id_user} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
