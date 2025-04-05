import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// Next.js doesn't have native WebSocket support in API routes
// Instead, we'll redirect to our WebSocket server which is running separately
// Our frontend will connect directly to the WebSocket server endpoint defined in the NEXT_PUBLIC_WEBSOCKET_URL env variable

export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return new NextResponse(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required"
      }), 
      { 
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  // WebSocket server URL from env or default
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
  
  return new NextResponse(
    JSON.stringify({
      message: "WebSocket support is implemented through a separate server",
      wsUrl,
      info: "Your client should connect directly to this WebSocket endpoint"
    }), 
    { 
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
} 