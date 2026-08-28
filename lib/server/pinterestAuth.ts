import { supabaseAdmin } from "./supabaseAdmin";

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID!;
const PINTEREST_APP_SECRET = process.env.PINTEREST_APP_SECRET!;
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

function basicAuthHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString(
      "base64"
    )
  );
}

export class PinterestNotConnectedError extends Error {
  constructor() {
    super("Pinterest isn't connected yet. Go to Settings and connect it.");
    this.name = "PinterestNotConnectedError";
  }
}

export async function getValidPinterestToken(): Promise<string> {
  const { data: row } = await supabaseAdmin
    .from("platform_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("platform", "pinterest")
    .maybeSingle();

  if (!row || !row.access_token) {
    throw new PinterestNotConnectedError();
  }

  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  const isExpiringSoon = expiresAt - Date.now() < 60_000;

  if (!isExpiringSoon || !row.refresh_token) {
    return row.access_token;
  }

  const refreshRes = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    throw new PinterestNotConnectedError();
  }

  const refreshed = await refreshRes.json();
  const newExpiresAt = new Date(
    Date.now() + refreshed.expires_in * 1000
  ).toISOString();

  await supabaseAdmin
    .from("platform_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? row.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq("platform", "pinterest");

  return refreshed.access_token;
}
