import { NextResponse } from "next/server";

export async function POST(request) {
  const { username, password } = await request.json();

  const validUsername = process.env.LGC_LOGIN_USERNAME;
  const validPassword = process.env.LGC_LOGIN_PASSWORD;
  const sessionToken = process.env.LGC_SESSION_TOKEN;

  if (!validUsername || !validPassword || !sessionToken) {
    return NextResponse.json(
      { error: "Login is not configured on the server." },
      { status: 500 }
    );
  }

  if (username !== validUsername || password !== validPassword) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("lgc_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
