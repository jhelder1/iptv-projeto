import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { token } = await request.json();

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https");
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: isHttps === true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
