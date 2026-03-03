import { NextRequest, NextResponse } from "next/server";

import { insertAutomationLog } from "@/lib/automation-log";
import { getDb } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/evolution";
import { sanitizeHtmlToText } from "@/lib/sanitize";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id_user: string }> }): Promise<NextResponse> {
  const { id_user } = await params;
  const sql = getDb();
  const idUser = Number(id_user);

  const [userRow] = await sql<{ nome: string; tel: string }[]>`
    SELECT nome, tel FROM app_user WHERE id = ${idUser} LIMIT 1
  `;
  if (!userRow?.tel) {
    return NextResponse.json({ error: "Cliente não encontrado ou sem telefone" }, { status: 404 });
  }

  const [accessRow] = await sql<{ dados: string }[]>`
    SELECT dados FROM acesso WHERE id_user = ${idUser} LIMIT 1
  `;
  if (!accessRow?.dados) {
    return NextResponse.json({ error: "Dados de acesso não encontrados" }, { status: 404 });
  }

  const dadosLimpos = sanitizeHtmlToText(accessRow.dados);
  const nome = userRow.nome?.trim() || "cliente";
  const mensagem = `Ola, ${nome}! Aqui estao seus dados de acesso:\n\n${dadosLimpos}\n\nGuarde essas informacoes.\n- Cine Play TV`;

  await sendWhatsAppText({ number: userRow.tel, text: mensagem });

  await insertAutomationLog({
    id_user: idUser,
    status: "success",
    erro: "reenvio_manual",
    whatsapp_enviado: true,
  });

  return NextResponse.json({ ok: true });
}
