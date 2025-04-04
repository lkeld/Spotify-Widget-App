import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await spotifyApi.getRecentlyPlayed(session.accessToken, 10)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching recently played:", error)
    return NextResponse.json({ error: "Failed to fetch recently played" }, { status: 500 })
  }
}

