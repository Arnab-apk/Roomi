import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeGoogleCodeForTokens, getGoogleProfile } from "@/lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const redirectUri = (
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback"
  ).trim();
  const appOrigin = new URL(redirectUri).origin;

  if (error || !code) {
    const session = await getSession();
    session.flashError = "auth-cancelled";
    await session.save();
    return NextResponse.redirect(new URL("/", appOrigin));
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code, redirectUri);
    const profile = await getGoogleProfile(tokens.access_token);
    const session = await getSession();
    session.hostId = crypto.randomUUID();
    session.roomCode = undefined;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.accountName = profile.displayName;
    session.isHost = true;
    session.provider = "youtube";
    await session.save();
    return NextResponse.redirect(new URL("/", appOrigin));
  } catch {
    const session = await getSession();
    session.flashError = "auth-failed";
    await session.save();
    return NextResponse.redirect(new URL("/", appOrigin));
  }
}
