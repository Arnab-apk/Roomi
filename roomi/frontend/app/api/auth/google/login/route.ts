import { NextResponse } from "next/server";

export async function GET() {
  const redirectUri = (
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback"
  ).trim();
  const params = new URLSearchParams({
    client_id: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
