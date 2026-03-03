import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const faturaSchema = z.object({
  id_user: z.number().int().positive(),
  valor: z.number().positive(),
  forma: z.string().default("pix"),
  vencimento: z.string(), // ISO date string
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sql = getDb();
  const { searchParams } = new URL(request.url);
  const situ = searchParams.get("situ"); // 0, 1, 2 ou null (todos)
  const id_user = searchParams.get("id_user");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 30;
  const offset = (page - 1) * limit;

  const rows = await sql<{
    id: number; id_user: number; nome: string; tel: string;
    situ: number; valor: number; forma: string;
    vencimento: string | null; data_pagamento: string | null; mp_payment_id: string | null;
  }[]>`
    SELECT
      f.id, f.id_user, u.nome, u.tel,
      f.situ, f.valor, f.forma, f.vencimento, f.data_pagamento, f.mp_payment_id
    FROM fatura f
    JOIN app_user u ON u.id = f.id_user
    WHERE (${situ} IS NULL OR f.situ = ${situ ? Number(situ) : null})
      AND (${id_user} IS NULL OR f.id_user = ${id_user ? Number(id_user) : null})
    ORDER BY f.vencimento DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM fatura f
    WHERE (${situ} IS NULL OR f.situ = ${situ ? Number(situ) : null})
      AND (${id_user} IS NULL OR f.id_user = ${id_user ? Number(id_user) : null})
  `;

  return NextResponse.json({ rows, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = faturaSchema.parse(await request.json());
  const sql = getDb();
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO fatura (id_user, situ, valor, forma, vencimento)
    VALUES (${body.id_user}, 0, ${body.valor}, ${body.forma}, ${body.vencimento})
    RETURNING id
  `;
  return NextResponse.json({ id: row.id }, { status: 201 });
}
