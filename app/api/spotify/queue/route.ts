import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const data = await spotifyApi.getQueue(session.accessToken)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching queue:", error)
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    )
  }
} 