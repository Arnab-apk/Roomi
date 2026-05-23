import type { Track } from "@/lib/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export class GoogleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

export async function exchangeGoogleCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    client_secret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new GoogleApiError(`Google token exchange failed: ${res.status}`, res.status);
  }
  return (await res.json()) as { access_token: string; refresh_token: string };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    client_secret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new GoogleApiError(`Google token refresh failed: ${res.status}`, res.status);
  }
  const payload = (await res.json()) as { access_token: string };
  return payload.access_token;
}

export async function getGoogleProfile(accessToken: string): Promise<{ displayName: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new GoogleApiError(`Google profile fetch failed: ${res.status}`, res.status);
  }
  const data = (await res.json()) as { name?: string; email?: string };
  return { displayName: data.name?.trim() || data.email || "Account" };
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export async function searchYouTube(
  apiKey: string,
  query: string,
  maxResults = 10,
): Promise<Track[]> {
  const safeMax = Math.max(1, Math.min(25, Math.floor(maxResults)));
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    q: query,
    maxResults: String(safeMax),
    key: apiKey,
  });
  const searchRes = await fetch(`${YOUTUBE_API}/search?${searchParams}`);
  if (!searchRes.ok) {
    throw new GoogleApiError(`YouTube search failed: ${searchRes.status}`, searchRes.status);
  }
  const searchData = (await searchRes.json()) as {
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
      };
    }>;
  };

  if (!searchData.items?.length) return [];

  const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
  const detailParams = new URLSearchParams({
    part: "contentDetails",
    id: videoIds,
    key: apiKey,
  });
  const detailRes = await fetch(`${YOUTUBE_API}/videos?${detailParams}`);
  if (!detailRes.ok) {
    throw new GoogleApiError(`YouTube video details failed: ${detailRes.status}`, detailRes.status);
  }
  const detailData = (await detailRes.json()) as {
    items: Array<{ id: string; contentDetails: { duration: string } }>;
  };

  const durationMap = new Map<string, number>();
  for (const item of detailData.items) {
    durationMap.set(item.id, parseISO8601Duration(item.contentDetails.duration));
  }

  return searchData.items.map((item) => {
    const videoId = item.id.videoId;
    const thumb =
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "";
    return {
      id: videoId,
      uri: videoId,
      provider: "youtube" as const,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      albumArt: thumb,
      durationMs: durationMap.get(videoId) ?? 0,
      addedBy: "",
    };
  });
}
