import { getDb } from "@/lib/db";

export type JobTipo = "whatsapp_retry";

export async function enqueueJob(tipo: JobTipo, payload: Record<string, unknown>): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO job_queue (tipo, payload)
    VALUES (${tipo}, ${JSON.stringify(payload)})
  `;
}

type JobRow = {
  id: number;
  tipo: string;
  payload: Record<string, unknown>;
  tentativas: number;
  max_tentativas: number;
};

export async function fetchPendingJobs(limit = 10): Promise<JobRow[]> {
  const sql = getDb();
  return sql<JobRow[]>`
    SELECT id, tipo, payload, tentativas, max_tentativas
    FROM job_queue
    WHERE status = 'pending' AND proximo_em <= now()
    ORDER BY proximo_em ASC
    LIMIT ${limit}
  `;
}

export async function markJobDone(id: number): Promise<void> {
  const sql = getDb();
  await sql`UPDATE job_queue SET status = 'done' WHERE id = ${id}`;
}

export async function markJobFailed(id: number, erro: string): Promise<void> {
  const sql = getDb();
  await sql`UPDATE job_queue SET status = 'failed', erro = ${erro} WHERE id = ${id}`;
}

export async function rescheduleJob(id: number, tentativas: number, maxTentativas: number, erro: string): Promise<void> {
  const sql = getDb();
  const newTentativas = tentativas + 1;

  if (newTentativas >= maxTentativas) {
    await markJobFailed(id, erro);
    return;
  }

  // Exponential backoff: 5min, 15min, 30min
  const delayMinutes = [5, 15, 30][newTentativas - 1] ?? 30;
  await sql`
    UPDATE job_queue
    SET tentativas = ${newTentativas},
        proximo_em = now() + (${delayMinutes} || ' minutes')::interval,
        erro = ${erro}
    WHERE id = ${id}
  `;
}
