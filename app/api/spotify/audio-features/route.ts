import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get("id")

  if (!trackId) {
    return NextResponse.json({ error: "Track ID is required" }, { status: 400 })
  }

  try {
    // Note: This endpoint has been deprecated by Spotify (returns 403)
    // We'll try to make the request, but fallback to a graceful response
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (response.status === 403) {
      // Return a mock response with empty data since the endpoint is deprecated
      console.log("Audio features endpoint is deprecated - returning fallback data")
      return NextResponse.json({
        message: "Audio features endpoint deprecated by Spotify",
        // Provide empty placeholder data to prevent client errors
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

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching audio features:", error)
    
    // Return an empty response object to avoid breaking the client
    return NextResponse.json({
      message: "Audio features unavailable",
      // Provide empty placeholder data
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
}

