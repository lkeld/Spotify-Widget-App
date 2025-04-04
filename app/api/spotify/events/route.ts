import { getSession } from "@/lib/auth"

// This is a Server-Sent Events (SSE) implementation for real-time updates
// This is more efficient than polling and works well with Next.js App Router
export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store last state to avoid sending duplicates
      let lastTrackId: string | null = null;
      let lastPlayState: boolean = false;
      let lastProgress: number = 0;
      let lastFetchTime: number = 0;
      
      // Function to fetch current playback
      const fetchPlayback = async () => {
        try {
          // Avoid over-fetching - only fetch if at least 500ms have passed
          const now = Date.now();
          if (now - lastFetchTime < 500) return;
          lastFetchTime = now;
          
          const response = await fetch("https://api.spotify.com/v1/me/player", {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          });
          
          if (response.status === 204) {
            // No active player
            const data = { type: "playback", data: { is_playing: false } };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            return;
          }
          
          if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Check if significant change has occurred
          const currentTrackId = data.item?.id || null;
          const isPlaying = data.is_playing || false;
          const progress = data.progress_ms || 0;
          
          const hasTrackChanged = currentTrackId !== lastTrackId;
          const hasPlayStateChanged = isPlaying !== lastPlayState;
          const hasProgressJumped = Math.abs(progress - lastProgress) > 2000;
          
          if (hasTrackChanged || hasPlayStateChanged || hasProgressJumped) {
            // Send playback update
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "playback", data })}\n\n`)
            );
            
            // Update last state
            lastTrackId = currentTrackId;
            lastPlayState = isPlaying;
            lastProgress = progress;
            
            // If track changed, also fetch queue
            if (hasTrackChanged) {
              try {
                const queueResponse = await fetch("https://api.spotify.com/v1/me/player/queue", {
                  headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                  },
                });
                
                if (queueResponse.ok) {
                  const queueData = await queueResponse.json();
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "queue", data: queueData })}\n\n`)
                  );
                }
              } catch (error) {
                console.error("Error fetching queue:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error in SSE stream:", error);
          // Send ping to keep connection alive even on error
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
        }
      };
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
      
      // Fetch immediately on connection
      fetchPlayback();
      
      // Then set up interval - fetch every 1 second while connection is open
      const interval = setInterval(fetchPlayback, 1000);
      
      // Clean up interval when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    },
  });

  // Return the SSE stream response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
} 