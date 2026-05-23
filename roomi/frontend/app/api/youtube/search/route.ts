import { NextResponse } from "next/server";
import { backendGetRoomToken } from "@/lib/backend";
import { searchYouTube, GoogleApiError } from "@/lib/google";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const roomCode =
    typeof body?.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";

  if (!roomCode) {
    return NextResponse.json({ error: "roomCode required" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json([]);
  }

  const tokens = await backendGetRoomToken(roomCode);
  if (!tokens) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 });
  }

  const limit = typeof body?.limit === "number" ? body.limit : 10;

  try {
    const tracks = await searchYouTube(apiKey, query, limit);
    return NextResponse.json(tracks);
  } catch (error) {
    if (error instanceof GoogleApiError) {
      return NextResponse.json({ error: "YouTube search failed" }, { status: error.status });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
