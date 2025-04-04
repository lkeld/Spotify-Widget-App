import { NextResponse } from "next/server"
import { generateRandomString } from "@/lib/utils"
import { cookies } from "next/headers"

// Spotify OAuth configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/api/auth/callback"
const SCOPE =
  "user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played user-top-read"

export async function GET() {
  // Check if environment variables are properly set
  if (!CLIENT_ID) {
    console.error("Missing SPOTIFY_CLIENT_ID environment variable")
    return NextResponse.json({ error: "Spotify client ID not configured" }, { status: 500 })
  }

  if (!REDIRECT_URI) {
    console.error("Missing SPOTIFY_REDIRECT_URI environment variable")
    return NextResponse.json({ error: "Spotify redirect URI not configured" }, { status: 500 })
  }

  // Generate state for CSRF protection
  const state = generateRandomString(16)

  // ***** AWAIT cookies() before using methods *****
  const cookieStore = await cookies()
  cookieStore.set("spotify_auth_state", state, {
    maxAge: 10 * 60, // 10 minutes
    path: "/",
    httpOnly: true, // Recommended for security
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
  });

  // Build the authorization URL
  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
    state: state,
  })

  const authUrl = `https://accounts.spotify.com/authorize?${queryParams.toString()}`

  console.log("Login Route - Authorization URL:", authUrl)

  // Return the URL for the client to redirect to
  return NextResponse.json({ url: authUrl })
}

