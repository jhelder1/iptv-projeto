import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`
    SELECT p.id, p.nome, p.descricao, p.valor_adicional, cp.created_at
    FROM cliente_produto cp
    JOIN produto p ON p.id = cp.id_produto
    WHERE cp.id_user = ${id}
    ORDER BY p.nome ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const { id_produto } = z.object({ id_produto: z.number().int().positive() }).parse(await request.json());
  const sql = getDb();
  await sql`
    INSERT INTO cliente_produto (id_user, id_produto)
    VALUES (${id}, ${id_produto})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const { id_produto } = z.object({ id_produto: z.number().int().positive() }).parse(await request.json());
  const sql = getDb();
  await sql`
    DELETE FROM cliente_produto WHERE id_user = ${id} AND id_produto = ${id_produto}
  `;
  return NextResponse.json({ ok: true });
}
