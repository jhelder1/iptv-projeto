import { NextRequest, NextResponse } from "next/server";

import { sendWhatsAppText } from "@/lib/evolution";
import { fetchPendingJobs, markJobDone, rescheduleJob } from "@/lib/job-queue";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await fetchPendingJobs(10);
  const results = { done: 0, rescheduled: 0, failed: 0 };

  for (const job of jobs) {
    try {
      if (job.tipo === "whatsapp_retry") {
        const { number, mensagem } = job.payload as { number: string; mensagem: string };
        await sendWhatsAppText({ number, text: mensagem });
        await markJobDone(job.id);
        results.done++;
      }
    } catch (err) {
      const erro = err instanceof Error ? err.message : "unknown";
      await rescheduleJob(job.id, job.tentativas, job.max_tentativas, erro);
      if (job.tentativas + 1 >= job.max_tentativas) {
        results.failed++;
      } else {
        results.rescheduled++;
      }
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, ...results });
}
