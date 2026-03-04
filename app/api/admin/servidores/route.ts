import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

const servidorSchema = z.object({
  nome: z.string().min(1),
  url_base: z.string().min(1),
  usuario_painel: z.string().optional(),
  senha_painel: z.string().optional(),
  porta: z.number().int().positive().optional().nullable(),
  protocolo: z.enum(["http", "https"]).default("http"),
  max_conexoes: z.number().int().positive().optional().nullable(),
  notas: z.string().optional(),
  ativo: z.boolean().default(true),
});

export async function GET(): Promise<NextResponse> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      s.id, s.nome, s.url_base, s.usuario_painel, s.porta,
      s.protocolo, s.max_conexoes, s.ativo, s.notas, s.created_at,
      COUNT(p.id)::int AS qtd_planos
    FROM servidor s
    LEFT JOIN plano p ON p.servidor_id = s.id AND p.ativo = true
    GROUP BY s.id
    ORDER BY s.ativo DESC, s.nome ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = servidorSchema.parse(await request.json());
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO servidor (nome, url_base, usuario_painel, senha_painel, porta, protocolo, max_conexoes, notas, ativo)
    VALUES (
      ${body.nome}, ${body.url_base},
      ${body.usuario_painel ?? null}, ${body.senha_painel ?? null},
      ${body.porta ?? null}, ${body.protocolo},
      ${body.max_conexoes ?? null}, ${body.notas ?? null}, ${body.ativo}
    )
    RETURNING id, nome, url_base, protocolo, porta, max_conexoes, ativo, created_at
  `;
  return NextResponse.json(row, { status: 201 });
}
