import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

// Simple in-memory cache for queue data
let queueCache: {
  data: any;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
}

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30000

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if it's still fresh
    if (queueCache.data && now - queueCache.timestamp < CACHE_TTL) {
      return NextResponse.json(queueCache.data)
    }
    
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const data = await spotifyApi.getQueue(session.accessToken)
    
    // Update cache
    queueCache = {
      data,
      timestamp: now
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching queue:", error)
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    )
  }
} 