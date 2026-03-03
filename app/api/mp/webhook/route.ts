import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { insertAutomationLog } from "@/lib/automation-log";
import { sendWhatsAppText } from "@/lib/evolution";
import { getEnv } from "@/lib/env";
import { fetchMercadoPagoPayment } from "@/lib/mercado-pago";
import { sanitizeHtmlToText } from "@/lib/sanitize";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  let idUserForError = 0;
  let paymentIdForError = "";
  const env = getEnv();

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const secretHeader = request.headers.get("x-webhook-secret");
    if (env.WEBHOOK_SECRET && secretHeader !== env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = webhookSchema.parse(await request.json());
    const paymentIdRaw = body.data?.id;
    if (!paymentIdRaw) {
      return NextResponse.json({ ignored: true, reason: "missing_payment_id" }, { status: 200 });
    }

    paymentIdForError = String(paymentIdRaw);
    const payment = await fetchMercadoPagoPayment(paymentIdForError);

    if (payment.status !== "approved") {
      return NextResponse.json({ ignored: true, reason: "payment_not_approved" }, { status: 200 });
    }

    const idUser = Number(payment.external_reference);
    if (!Number.isInteger(idUser) || idUser <= 0) {
      throw new Error(`Invalid external_reference: ${payment.external_reference}`);
    }
    idUserForError = idUser;

    const { data: pendingInvoice, error: pendingInvoiceError } = await supabaseAdmin
      .from("fatura")
      .select("id")
      .eq("id_user", idUser)
      .eq("situ", 0)
      .order("vencimento", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pendingInvoiceError) {
      throw new Error(`Failed to read pending invoice: ${pendingInvoiceError.message}`);
    }

    if (!pendingInvoice) {
      await insertAutomationLog({
        id_user: idUser,
        mp_payment_id: String(payment.id),
        status: "success",
        erro: "noop_already_processed",
        whatsapp_enviado: false,
      });
      return NextResponse.json({ ok: true, processed: false, reason: "already_paid" }, { status: 200 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("fatura")
      .update({ situ: 1 })
      .eq("id", pendingInvoice.id);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from("acesso")
      .select("dados")
      .eq("id_user", idUser)
      .limit(1);

    if (accessError) {
      throw new Error(`Failed to fetch access data: ${accessError.message}`);
    }

    const dados = accessRows?.[0]?.dados;
    if (!dados) {
      throw new Error("Missing access data");
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from("app_user")
      .select("nome, tel")
      .eq("id", idUser)
      .maybeSingle();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    if (!userData?.tel) {
      throw new Error("Missing user phone");
    }

    const dadosLimpos = sanitizeHtmlToText(dados);
    const nome = userData.nome?.trim() || "cliente";
    const mensagem = `Ola, ${nome}! Pagamento confirmado!\n\nSeus dados de acesso:\n${dadosLimpos}\n\nGuarde essas informacoes.\n- Cine Play TV`;

    await sendWhatsAppText({
      number: userData.tel,
      text: mensagem,
    });

    await insertAutomationLog({
      id_user: idUser,
      id_fatura: pendingInvoice.id,
      mp_payment_id: String(payment.id),
      status: "success",
      whatsapp_enviado: true,
    });

    return NextResponse.json(
      {
        ok: true,
        processed: true,
        id_user: idUser,
        id_fatura: pendingInvoice.id,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (idUserForError > 0) {
      try {
        await insertAutomationLog({
          id_user: idUserForError,
          mp_payment_id: paymentIdForError || null,
          status: "error",
          erro: message,
          whatsapp_enviado: false,
        });
      } catch {
        // no-op
      }
    }

    try {
      await sendWhatsAppText({
        number: env.ADMIN_WHATSAPP,
        text: `Erro na automacao MP: id_user=${idUserForError || "n/a"} payment_id=${paymentIdForError || "n/a"} erro=${message}`,
      });
    } catch {
      // no-op
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
