import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const updateSchema = z.object({
  situ: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  const { situ } = updateSchema.parse(await request.json());
  const idNum = Number(id);

  if (situ === 1) {
    // Pagar manualmente
    await sql`
      UPDATE fatura SET situ = 1, data_pagamento = now()
      WHERE id = ${idNum} AND situ = 0
    `;
    // Reativar acesso
    const [fatura] = await sql<{ id_user: number }[]>`SELECT id_user FROM fatura WHERE id = ${idNum}`;
    if (fatura) {
      await sql`UPDATE acesso SET ativo = true WHERE id_user = ${fatura.id_user}`;
    }
  } else if (situ === 2) {
    // Cancelar
    await sql`UPDATE fatura SET situ = 2 WHERE id = ${idNum}`;
  } else if (situ === 0) {
    // Reabrir (estornar manual)
    await sql`UPDATE fatura SET situ = 0, data_pagamento = null, mp_payment_id = null WHERE id = ${idNum}`;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const sql = getDb();
  await sql`DELETE FROM fatura WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
