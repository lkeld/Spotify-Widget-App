import { cookies } from "next/headers"
import { logDebug, logError } from "./debug"

export async function getSession() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("spotify_access_token")
  const refreshToken = cookieStore.get("spotify_refresh_token")

  if (!accessToken) {
    logDebug("No access token found")
    return null
  }

  // Verify token is valid
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
      },
    })

    if (response.ok) {
      const user = await response.json()

      return {
        user,
        accessToken: accessToken.value,
      }
    }

    // Token might be expired, try to refresh if we have a refresh token
    if (response.status === 401 && refreshToken) {
      logDebug("Access token expired, attempting to refresh")
      const newToken = await refreshAccessToken(refreshToken.value)

      if (newToken) {
        return {
          accessToken: newToken,
        }
      }
    }

    logError("Failed to validate token", { status: response.status })
    return null
  } catch (error) {
    logError("Error validating session", error)
    return null
  }
}

async function refreshAccessToken(refreshToken: string) {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

  if (!CLIENT_ID || !CLIENT_SECRET) {
    logError("Missing client credentials for token refresh")
    return null
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      logError("Failed to refresh token", await response.text())
      return null
    }

    const data = await response.json()

    // Update cookies
    const cookieStore = await cookies()
    cookieStore.set("spotify_access_token", data.access_token, {
      maxAge: data.expires_in,
      path: "/",
    })

    // Update refresh token if provided
    if (data.refresh_token) {
      cookieStore.set("spotify_refresh_token", data.refresh_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })
    }

    return data.access_token
  } catch (error) {
    logError("Error refreshing token", error)
    return null
  }
}

