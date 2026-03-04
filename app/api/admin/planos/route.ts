import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const planoSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().positive(),
  dias_vigencia: z.number().int().positive().default(30),
  ativo: z.boolean().default(true),
  servidor_id: z.number().int().positive().optional().nullable(),
});

export async function GET(): Promise<NextResponse> {
  const sql = getDb();
  const rows = await sql`
    SELECT p.id, p.nome, p.valor, p.dias_vigencia, p.ativo, p.created_at,
           p.servidor_id, s.nome AS servidor_nome
    FROM plano p
    LEFT JOIN servidor s ON s.id = p.servidor_id
    ORDER BY p.ativo DESC, p.nome ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = planoSchema.parse(await request.json());
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO plano (nome, valor, dias_vigencia, ativo, servidor_id)
    VALUES (${body.nome}, ${body.valor}, ${body.dias_vigencia}, ${body.ativo}, ${body.servidor_id ?? null})
    RETURNING id, nome, valor, dias_vigencia, ativo, servidor_id, created_at
  `;
  return NextResponse.json(row, { status: 201 });
}
