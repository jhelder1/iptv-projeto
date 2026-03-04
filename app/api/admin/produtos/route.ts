import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const produtoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  valor_adicional: z.number().min(0).default(0),
  ativo: z.boolean().default(true),
});

export async function GET(): Promise<NextResponse> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, nome, descricao, valor_adicional, ativo, created_at
    FROM produto
    ORDER BY ativo DESC, nome ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = produtoSchema.parse(await request.json());
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO produto (nome, descricao, valor_adicional, ativo)
    VALUES (${body.nome}, ${body.descricao ?? null}, ${body.valor_adicional}, ${body.ativo})
    RETURNING id, nome, descricao, valor_adicional, ativo, created_at
  `;
  return NextResponse.json(row, { status: 201 });
}
