import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  url_base: z.string().min(1).optional(),
  usuario_painel: z.string().optional().nullable(),
  senha_painel: z.string().optional().nullable(),
  porta: z.number().int().positive().optional().nullable(),
  protocolo: z.enum(["http", "https"]).optional(),
  max_conexoes: z.number().int().positive().optional().nullable(),
  notas: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();

  const [servidor] = await sql`
    SELECT id, nome, url_base, usuario_painel, porta,
           protocolo, max_conexoes, ativo, notas, created_at
    FROM servidor WHERE id = ${id}
  `;
  if (!servidor) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const planos = await sql`
    SELECT id, nome, valor, dias_vigencia, ativo
    FROM plano WHERE servidor_id = ${id}
    ORDER BY ativo DESC, nome ASC
  `;

  return NextResponse.json({ ...servidor, planos });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const sql = getDb();

  const fields = Object.entries(body)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ({ k, v }));

  if (fields.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  // Build dynamic SET clause
  const setClauses = fields.map(({ k }, i) => `${k} = $${i + 2}`).join(", ");
  const values = [id, ...fields.map(({ v }) => v)];
  const result = await sql.unsafe(
    `UPDATE servidor SET ${setClauses} WHERE id = $1 RETURNING id, nome, url_base, protocolo, ativo`,
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
  await sql`UPDATE servidor SET ativo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
