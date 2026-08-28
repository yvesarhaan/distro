import { NextResponse } from "next/server";

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID!;
const SCOPES = "boards:read,pins:read,pins:write";

export async function GET(req: Request) {
  const redirectUri = new URL("/api/auth/pinterest/callback", req.url).toString();

  const params = new URLSearchParams({
    client_id: PINTEREST_APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
  });

  return NextResponse.redirect(
    `https://www.pinterest.com/oauth/?${params.toString()}`
  );
}
