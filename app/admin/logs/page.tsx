import Link from "next/link";

import { getSupabaseAdmin } from "@/lib/supabase";

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
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("automation_log")
    .select("id, id_user, id_fatura, mp_payment_id, status, erro, whatsapp_enviado, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Falha ao carregar logs: ${error.message}`);
  }

  return (data ?? []) as LogRow[];
}

export default async function LogsPage() {
  const logs = await getLogs();

  return (
    <main>
      <section className="card" style={{ marginBottom: "1rem" }}>
        <h1 className="title">Logs de Automacao</h1>
        <p className="muted">
          Ultimas 50 execucoes do fluxo de pagamento. Voltar para <Link href="/">home</Link>.
        </p>
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Fatura</th>
              <th>Pagamento MP</th>
              <th>Status</th>
              <th>WhatsApp</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhum log encontrado.</td>
              </tr>
            ) : null}
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.id_user}</td>
                <td>{log.id_fatura ?? "-"}</td>
                <td>{log.mp_payment_id ?? "-"}</td>
                <td>
                  <span className={`badge ${log.status === "success" ? "success" : "error"}`}>{log.status}</span>
                  {log.erro ? <div className="muted">{log.erro}</div> : null}
                </td>
                <td>{log.whatsapp_enviado ? "sim" : "nao"}</td>
                <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
