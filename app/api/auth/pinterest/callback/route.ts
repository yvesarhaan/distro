import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/server/supabaseAdmin";

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID!;
const PINTEREST_APP_SECRET = process.env.PINTEREST_APP_SECRET!;
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(
      new URL("/settings?pinterest_error=1", req.url)
    );
  }

  const redirectUri = new URL(
    "/api/auth/pinterest/callback",
    req.url
  ).toString();

  const tokenRes = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString(
          "base64"
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/settings?pinterest_error=1", req.url)
    );
  }

  const tokenData = await tokenRes.json();
  const expiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  ).toISOString();

  await supabaseAdmin.from("platform_connections").upsert(
    {
      platform: "pinterest",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "platform" }
  );

  return NextResponse.redirect(new URL("/settings?pinterest_connected=1", req.url));
}
