import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const clienteSchema = z.object({
  nome: z.string().min(1),
  tel: z.string().min(8),
  email: z.string().email().optional().nullable(),
  plano_id: z.number().int().positive().optional().nullable(),
  data_vencimento: z.string().optional().nullable(), // YYYY-MM-DD
  dados_acesso: z.string().min(1), // HTML ou texto com credenciais IPTV
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sql = getDb();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await sql<{
    id: number;
    nome: string;
    tel: string;
    email: string | null;
    ativo: boolean;
    plano_id: number | null;
    plano_nome: string | null;
    data_vencimento: string | null;
    faturas_pendentes: number;
  }[]>`
    SELECT
      u.id,
      u.nome,
      u.tel,
      u.email,
      u.ativo,
      u.plano_id,
      p.nome AS plano_nome,
      u.data_vencimento,
      (SELECT COUNT(*) FROM fatura f WHERE f.id_user = u.id AND f.situ = 0)::int AS faturas_pendentes
    FROM app_user u
    LEFT JOIN plano p ON p.id = u.plano_id
    WHERE (${q} = '' OR u.nome ILIKE ${'%' + q + '%'} OR u.tel ILIKE ${'%' + q + '%'})
    ORDER BY u.ativo DESC, u.nome ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM app_user
    WHERE (${q} = '' OR nome ILIKE ${'%' + q + '%'} OR tel ILIKE ${'%' + q + '%'})
  `;

  return NextResponse.json({ rows, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = clienteSchema.parse(await request.json());
  const sql = getDb();

  const [user] = await sql<{ id: number }[]>`
    INSERT INTO app_user (nome, tel, email, plano_id, data_vencimento)
    VALUES (${body.nome}, ${body.tel}, ${body.email ?? null}, ${body.plano_id ?? null}, ${body.data_vencimento ?? null})
    RETURNING id
  `;

  await sql`
    INSERT INTO acesso (id_user, dados, ativo)
    VALUES (${user.id}, ${body.dados_acesso}, true)
  `;

  return NextResponse.json({ id: user.id }, { status: 201 });
}
