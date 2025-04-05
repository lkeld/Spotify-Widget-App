import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

/**
 * API endpoint to retrieve the current access token for the authenticated user
 * This is used by the WebSocket client to authenticate with the WebSocket server
 */
export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session || !session.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    accessToken: session.accessToken,
  });
} 