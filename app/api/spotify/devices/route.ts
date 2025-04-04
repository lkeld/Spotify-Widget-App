import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await spotifyApi.getDevices(session.accessToken)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
  }
}

