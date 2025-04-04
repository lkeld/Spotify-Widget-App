import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Spotify OAuth configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
// Use the API route for the redirect URI
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3000/api/auth/callback" 

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // ***** AWAIT cookies() before using methods *****
  const cookieStore = await cookies()
  const storedState = cookieStore.get("spotify_auth_state")?.value

  // -- Error Handling & State Verification --
  if (error) {
    console.error("Callback Route - Spotify authorization error:", error)
    // Redirect back to home page with Spotify's error
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!state || state !== storedState) {
    console.error("Callback Route - State mismatch error", { state, storedState })
    // Redirect back to home page with state mismatch error
    return NextResponse.redirect(new URL("/?error=state_mismatch", request.url))
  }

  // Clear the state cookie now that it's verified
  cookieStore.delete("spotify_auth_state");

  if (!code) {
    console.error("Callback Route - Missing authorization code error")
    // Redirect back to home page with missing code error
    return NextResponse.redirect(new URL("/?error=missing_code", request.url))
  }

  // -- Token Exchange --
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Callback Route - Missing Spotify client credentials on server")
      return NextResponse.redirect(new URL("/?error=missing_credentials", request.url))
    }

    console.log("Callback Route - Exchanging code for token using redirect URI:", REDIRECT_URI)

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI, // Must match the URI used in the initial auth request
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.json()
      const errorText = errorBody.error_description || JSON.stringify(errorBody)
      console.error("Callback Route - Token exchange failed:", errorText)
      return NextResponse.redirect(
        new URL(`/?error=token_exchange_failed&details=${encodeURIComponent(errorText)}`, request.url),
      )
    }

    const tokenData = await tokenResponse.json()

    // -- Set Cookies & Redirect --
    const { access_token, refresh_token, expires_in } = tokenData

    // Set the access token cookie
    cookieStore.set("spotify_access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in, // Typically 3600 seconds (1 hour)
      path: "/",
    })

    // Set the refresh token cookie (longer expiry)
    cookieStore.set("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    console.log("Callback Route - Successfully obtained tokens and set cookies.")
    // Redirect to the dashboard page on success
    return NextResponse.redirect(new URL("/dashboard", request.url))

  } catch (error: unknown) {
    console.error("Callback Route - Server error:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.redirect(
      new URL(`/?error=callback_server_error&message=${encodeURIComponent(errorMessage)}`, request.url),
    )
  }
}

