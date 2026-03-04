import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  valor_adicional: z.number().min(0).optional(),
  ativo: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const sql = getDb();

  const fields = Object.entries(body).filter(([, v]) => v !== undefined);
  if (fields.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const setClauses = fields.map(([k], i) => `${k} = $${i + 2}`).join(", ");
  const values = [id, ...fields.map(([, v]) => v)];
  const result = await sql.unsafe(
    `UPDATE produto SET ${setClauses} WHERE id = $1 RETURNING id, nome, descricao, valor_adicional, ativo`,
    values
  );

  if (result.length === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  await sql`UPDATE produto SET ativo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
