import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const planoSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().positive(),
  dias_vigencia: z.number().int().positive().default(30),
  ativo: z.boolean().default(true),
});

export async function GET(): Promise<NextResponse> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, nome, valor, dias_vigencia, ativo, created_at
    FROM plano
    ORDER BY ativo DESC, nome ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = planoSchema.parse(await request.json());
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO plano (nome, valor, dias_vigencia, ativo)
    VALUES (${body.nome}, ${body.valor}, ${body.dias_vigencia}, ${body.ativo})
    RETURNING id, nome, valor, dias_vigencia, ativo, created_at
  `;
  return NextResponse.json(row, { status: 201 });
}
