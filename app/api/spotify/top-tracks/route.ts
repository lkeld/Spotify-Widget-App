import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await spotifyApi.getTopTracks(session.accessToken, 10, "short_term")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching top tracks:", error)
    return NextResponse.json({ error: "Failed to fetch top tracks" }, { status: 500 })
  }
}

