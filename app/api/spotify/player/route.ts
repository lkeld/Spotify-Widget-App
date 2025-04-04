import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { spotifyApi } from "@/lib/spotify-api"

export async function PUT(request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "toggle-play":
        // Check if explicit play/pause state is specified
        if (body.state !== undefined) {
          await spotifyApi.togglePlayback(session.accessToken, body.state)
        } else {
          // Get current state and toggle
          const playbackData = await spotifyApi.getCurrentPlayback(session.accessToken) as { is_playing: boolean };
          await spotifyApi.togglePlayback(session.accessToken, !playbackData.is_playing)
        }
        break

      case "volume":
        await spotifyApi.setVolume(session.accessToken, body.volume_percent)
        break

      case "seek":
        await spotifyApi.seekToPosition(session.accessToken, body.position_ms)
        break

      case "transfer":
        await spotifyApi.transferPlayback(session.accessToken, body.device_id, body.play !== false)
        break

      case "shuffle":
        await spotifyApi.setShuffleState(session.accessToken, body.state)
        break

      case "repeat":
        await spotifyApi.setRepeatState(session.accessToken, body.state)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
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

    switch (action) {
      case "next":
        await spotifyApi.skipToNext(session.accessToken)
        break

      case "previous":
        await spotifyApi.skipToPrevious(session.accessToken)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error controlling player:", error)
    return NextResponse.json({ error: "Failed to control player" }, { status: 500 })
  }
}

