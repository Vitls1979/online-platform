import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return new NextResponse("Неверные учетные данные", { status: 400 });
  }

  if (!body.email.includes("@")) {
    return new NextResponse("Email должен содержать @", { status: 400 });
  }

  if (body.password.length < 4) {
    return new NextResponse("Пароль слишком короткий", { status: 400 });
  }

  return NextResponse.json({
    token: "demo-token",
    name: body.email.split("@")[0] ?? "user",
  });
}
