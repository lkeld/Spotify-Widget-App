import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

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
    const data = await spotifyApi.getAudioFeatures(session.accessToken, trackId)
    
    // If we got a response, return it
    if (data) {
      return NextResponse.json(data)
    }
    
    // If no data, fall back to placeholder
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

