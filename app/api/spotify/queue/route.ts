import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Add timestamp to ensure we don't get cached responses
    const timestamp = Date.now()
    const response = await fetch(`https://api.spotify.com/v1/me/player/queue?timestamp=${timestamp}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Cache-Control": "no-cache"
      },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Spotify API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching queue:", error)
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    )
  }
} 