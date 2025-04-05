import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get("id")

  if (!trackId) {
    return NextResponse.json({ error: "Track ID is required" }, { status: 400 })
  }

  // Return fallback data immediately without making any Spotify API calls
  return NextResponse.json({
    message: "Audio features unavailable",
    danceability: 0,
    energy: 0,
    key: 0,
    loudness: 0,
    mode: 0,
    speechiness: 0,
    acousticness: 0,
    instrumentalness: 0,
    liveness: 0,
    valence: 0,
    tempo: 0,
    id: trackId,
    duration_ms: 0,
    time_signature: 4
  }, { status: 200 })
}

