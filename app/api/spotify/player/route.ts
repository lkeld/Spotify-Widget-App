import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function PUT(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    let endpoint = ""
    const method = "PUT"
    let payload = {}

    switch (action) {
      case "toggle-play":
        // Check current state first
        const stateResponse = await fetch("https://api.spotify.com/v1/me/player", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })

        if (stateResponse.status !== 204) {
          const stateData = await stateResponse.json()
          endpoint = `https://api.spotify.com/v1/me/player/${stateData.is_playing ? "pause" : "play"}`
        } else {
          // Default to play if no state
          endpoint = "https://api.spotify.com/v1/me/player/play"
        }
        break

      case "volume":
        endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${body.volume_percent}`
        break

      case "seek":
        endpoint = `https://api.spotify.com/v1/me/player/seek?position_ms=${body.position_ms}`
        break

      case "transfer":
        endpoint = "https://api.spotify.com/v1/me/player"
        payload = {
          device_ids: [body.device_id],
          play: true,
        }
        break

      case "shuffle":
        endpoint = `https://api.spotify.com/v1/me/player/shuffle?state=${body.state}`
        break

      case "repeat":
        endpoint = `https://api.spotify.com/v1/me/player/repeat?state=${body.state}`
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error controlling player:", error)
    return NextResponse.json({ error: "Failed to control player" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    let endpoint = ""

    switch (action) {
      case "next":
        endpoint = "https://api.spotify.com/v1/me/player/next"
        break

      case "previous":
        endpoint = "https://api.spotify.com/v1/me/player/previous"
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok && response.status !== 204) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error controlling player:", error)
    return NextResponse.json({ error: "Failed to control player" }, { status: 500 })
  }
}

