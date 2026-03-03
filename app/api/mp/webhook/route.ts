import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { insertAutomationLog } from "@/lib/automation-log";
import { getDb } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/evolution";
import { getEnv } from "@/lib/env";
import { enqueueJob } from "@/lib/job-queue";
import { fetchMercadoPagoPayment } from "@/lib/mercado-pago";
import { sanitizeHtmlToText } from "@/lib/sanitize";

const CANCELLED_STATUSES = new Set(["cancelled", "refunded", "charged_back"]);

const webhookSchema = z
  .object({
    action: z.string().optional(),
    type: z.string().optional(),
    data: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
      })
      .optional(),
  })
  .passthrough();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const env = getEnv();

  const secretHeader = request.headers.get("x-webhook-secret");
  if (env.WEBHOOK_SECRET && secretHeader !== env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof webhookSchema>;
  try {
    body = webhookSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ignored: true, reason: "invalid_body" }, { status: 200 });
  }

  const paymentIdRaw = body.data?.id;
  if (!paymentIdRaw) {
    return NextResponse.json({ ignored: true, reason: "missing_payment_id" }, { status: 200 });
  }

  const paymentId = String(paymentIdRaw);

  let payment: Awaited<ReturnType<typeof fetchMercadoPagoPayment>>;
  try {
    payment = await fetchMercadoPagoPayment(paymentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "mp_fetch_error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // ── Chargeback / Estorno / Cancelamento ─────────────────────────────────
  if (CANCELLED_STATUSES.has(payment.status)) {
    return handleCancellation(payment, env);
  }

  // ── Pagamento aprovado ───────────────────────────────────────────────────
  if (payment.status !== "approved") {
    return NextResponse.json({ ignored: true, reason: "payment_not_approved" }, { status: 200 });
  }

  return handleApproved(payment, paymentId, env);
}

// ── Pagamento aprovado ───────────────────────────────────────────────────────
async function handleApproved(
  payment: { id: number; status: string; external_reference: string | null },
  paymentId: string,
  env: ReturnType<typeof getEnv>,
): Promise<NextResponse> {
  const sql = getDb();
  let idUser = 0;

  try {
    idUser = Number(payment.external_reference);
    if (!Number.isInteger(idUser) || idUser <= 0) {
      throw new Error(`Invalid external_reference: ${payment.external_reference}`);
    }

    const [pendingInvoice] = await sql<{ id: number }[]>`
      SELECT id FROM fatura
      WHERE id_user = ${idUser} AND situ = 0
      ORDER BY vencimento ASC
      LIMIT 1
    `;

    if (!pendingInvoice) {
      await insertAutomationLog({
        id_user: idUser,
        mp_payment_id: paymentId,
        status: "success",
        erro: "noop_already_processed",
        whatsapp_enviado: false,
      });
      return NextResponse.json({ ok: true, processed: false, reason: "already_paid" }, { status: 200 });
    }

    await sql`
      UPDATE fatura
      SET situ = 1, data_pagamento = now(), mp_payment_id = ${paymentId}
      WHERE id = ${pendingInvoice.id}
    `;

    // Reativar acesso caso estivesse suspenso
    await sql`UPDATE acesso SET ativo = true WHERE id_user = ${idUser}`;

    const [accessRow] = await sql<{ dados: string }[]>`
      SELECT dados FROM acesso WHERE id_user = ${idUser} LIMIT 1
    `;
    const [userRow] = await sql<{ nome: string; tel: string }[]>`
      SELECT nome, tel FROM app_user WHERE id = ${idUser} LIMIT 1
    `;

    if (!accessRow?.dados) throw new Error("Missing access data");
    if (!userRow?.tel) throw new Error("Missing user phone");

    const dadosLimpos = sanitizeHtmlToText(accessRow.dados);
    const nome = userRow.nome?.trim() || "cliente";
    const mensagem = `Ola, ${nome}! Pagamento confirmado!\n\nSeus dados de acesso:\n${dadosLimpos}\n\nGuarde essas informacoes.\n- Cine Play TV`;

    let whatsappEnviado = false;
    try {
      await sendWhatsAppText({ number: userRow.tel, text: mensagem });
      whatsappEnviado = true;
    } catch {
      // WhatsApp falhou → agendar retry
      await enqueueJob("whatsapp_retry", {
        id_user: idUser,
        id_fatura: pendingInvoice.id,
        mp_payment_id: paymentId,
        number: userRow.tel,
        mensagem,
      });
    }

    await insertAutomationLog({
      id_user: idUser,
      id_fatura: pendingInvoice.id,
      mp_payment_id: paymentId,
      status: "success",
      whatsapp_enviado: whatsappEnviado,
    });

    return NextResponse.json({ ok: true, processed: true, id_user: idUser, id_fatura: pendingInvoice.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (idUser > 0) {
      try {
        await insertAutomationLog({ id_user: idUser, mp_payment_id: paymentId, status: "error", erro: message });
      } catch { /* no-op */ }
    }

    try {
      await sendWhatsAppText({
        number: env.ADMIN_WHATSAPP,
        text: `Erro MP aprovado: id_user=${idUser || "n/a"} payment_id=${paymentId} erro=${message}`,
      });
    } catch { /* no-op */ }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ── Cancelamento / Chargeback ────────────────────────────────────────────────
async function handleCancellation(
  payment: { id: number; status: string; external_reference: string | null },
  env: ReturnType<typeof getEnv>,
): Promise<NextResponse> {
  const sql = getDb();
  const paymentId = String(payment.id);

  try {
    // Busca fatura pelo mp_payment_id
    const [fatura] = await sql<{ id: number; id_user: number }[]>`
      SELECT id, id_user FROM fatura
      WHERE mp_payment_id = ${paymentId} AND situ = 1
      LIMIT 1
    `;

    if (!fatura) {
      return NextResponse.json({ ignored: true, reason: "fatura_not_found" }, { status: 200 });
    }

    await sql`UPDATE fatura SET situ = 2 WHERE id = ${fatura.id}`;
    await sql`UPDATE acesso SET ativo = false WHERE id_user = ${fatura.id_user}`;

    const [userRow] = await sql<{ nome: string; tel: string }[]>`
      SELECT nome, tel FROM app_user WHERE id = ${fatura.id_user} LIMIT 1
    `;

    if (userRow?.tel) {
      try {
        await sendWhatsAppText({
          number: userRow.tel,
          text: `Ola, ${userRow.nome?.trim() || "cliente"}. Seu pagamento foi estornado/cancelado e seu acesso foi suspenso. Entre em contato para regularizar.\n- Cine Play TV`,
        });
      } catch { /* no-op */ }
    }

    await insertAutomationLog({
      id_user: fatura.id_user,
      id_fatura: fatura.id,
      mp_payment_id: paymentId,
      status: "success",
      erro: `chargeback_${payment.status}`,
      whatsapp_enviado: !!userRow?.tel,
    });

    return NextResponse.json({ ok: true, action: "chargeback_processed", id_fatura: fatura.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await sendWhatsAppText({
        number: env.ADMIN_WHATSAPP,
        text: `Erro chargeback MP: payment_id=${paymentId} status=${payment.status} erro=${message}`,
      });
    } catch { /* no-op */ }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
