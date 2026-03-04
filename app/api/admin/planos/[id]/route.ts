import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  valor: z.number().positive().optional(),
  dias_vigencia: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
  servidor_id: z.number().int().positive().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  const [row] = await sql`
    SELECT p.id, p.nome, p.valor, p.dias_vigencia, p.ativo, p.created_at,
           p.servidor_id, s.nome AS servidor_nome
    FROM plano p
    LEFT JOIN servidor s ON s.id = p.servidor_id
    WHERE p.id = ${id}
  `;
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(row);
}

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
    `UPDATE plano SET ${setClauses} WHERE id = $1 RETURNING id, nome, valor, dias_vigencia, ativo, servidor_id`,
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
  await sql`UPDATE plano SET ativo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
