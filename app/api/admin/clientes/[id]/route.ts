import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  tel: z.string().min(8).optional(),
  email: z.string().email().nullable().optional(),
  plano_id: z.number().int().positive().nullable().optional(),
  data_vencimento: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  dados_acesso: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  const idNum = Number(id);

  const [user] = await sql<{
    id: number; nome: string; tel: string; email: string | null;
    ativo: boolean; plano_id: number | null; plano_nome: string | null; data_vencimento: string | null;
  }[]>`
    SELECT u.id, u.nome, u.tel, u.email, u.ativo, u.plano_id, p.nome AS plano_nome, u.data_vencimento
    FROM app_user u LEFT JOIN plano p ON p.id = u.plano_id
    WHERE u.id = ${idNum}
  `;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [acesso] = await sql<{ dados: string; ativo: boolean }[]>`
    SELECT dados, ativo FROM acesso WHERE id_user = ${idNum} LIMIT 1
  `;

  const faturas = await sql<{
    id: number; situ: number; valor: number; vencimento: string | null; data_pagamento: string | null; mp_payment_id: string | null;
  }[]>`
    SELECT id, situ, valor, vencimento, data_pagamento, mp_payment_id
    FROM fatura WHERE id_user = ${idNum} ORDER BY created_at DESC LIMIT 20
  `;

  const logs = await sql<{
    id: number; status: string; erro: string | null; whatsapp_enviado: boolean; created_at: string;
  }[]>`
    SELECT id, status, erro, whatsapp_enviado, created_at
    FROM automation_log WHERE id_user = ${idNum} ORDER BY created_at DESC LIMIT 10
  `;

  return NextResponse.json({ user, acesso: acesso ?? null, faturas, logs });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  const idNum = Number(id);
  const body = updateSchema.parse(await request.json());

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { dados_acesso, ...userFields } = body;

  if (Object.keys(userFields).length > 0) {
    const sets = Object.entries(userFields)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    if (sets.includes("nome") || sets.includes("tel") || sets.includes("email") ||
        sets.includes("plano_id") || sets.includes("data_vencimento") || sets.includes("ativo")) {
      await sql`
        UPDATE app_user SET
          nome = COALESCE(${userFields.nome ?? null}, nome),
          tel = COALESCE(${userFields.tel ?? null}, tel),
          email = CASE WHEN ${userFields.email !== undefined} THEN ${userFields.email ?? null} ELSE email END,
          plano_id = CASE WHEN ${userFields.plano_id !== undefined} THEN ${userFields.plano_id ?? null} ELSE plano_id END,
          data_vencimento = CASE WHEN ${userFields.data_vencimento !== undefined} THEN ${userFields.data_vencimento ?? null} ELSE data_vencimento END,
          ativo = COALESCE(${userFields.ativo ?? null}, ativo)
        WHERE id = ${idNum}
      `;
    }
  }

  if (dados_acesso) {
    await sql`
      INSERT INTO acesso (id_user, dados, ativo) VALUES (${idNum}, ${dados_acesso}, true)
      ON CONFLICT (id_user) DO UPDATE SET dados = EXCLUDED.dados
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  await sql`UPDATE app_user SET ativo = false WHERE id = ${Number(id)}`;
  await sql`UPDATE acesso SET ativo = false WHERE id_user = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
