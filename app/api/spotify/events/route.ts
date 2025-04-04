import { getSession } from "@/lib/auth"
import { spotifyApi, clearCache } from "@/lib/spotify-api"

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
      let lastQueueHash: string = "";
      
      // Function to fetch current playback
      const fetchPlayback = async () => {
        try {
          // Use the cached/throttled API client
          const data = await spotifyApi.getCurrentPlayback(session.accessToken) as any;
          
          if (!data || !data.item) {
            // No active player
            const noPlayerData = { type: "playback", data: { is_playing: false } };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(noPlayerData)}\n\n`));
            return;
          }
          
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
            
            // If track changed, also fetch queue - but don't refetch if we just did
            if (hasTrackChanged) {
              fetchQueue();
              
              // Also clear any cached audio features for the new track
              if (currentTrackId) {
                clearCache(`audio-features-${currentTrackId}`);
              }
            }
          }
        } catch (error) {
          console.error("Error in SSE stream:", error);
          // Send ping to keep connection alive even on error
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
        }
      };
      
      // Function to fetch queue (separated to avoid redundant fetches)
      const fetchQueue = async () => {
        try {
          const queueData = await spotifyApi.getQueue(session.accessToken) as any;
          
          if (queueData) {
            // Create a simple hash of the queue to detect changes
            const queueHash = queueData.queue
              ? queueData.queue.map((t: any) => t.id).join('|')
              : '';
              
            if (queueHash !== lastQueueHash) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "queue", data: queueData })}\n\n`)
              );
              lastQueueHash = queueHash;
            }
          }
        } catch (error) {
          console.error("Error fetching queue:", error);
        }
      };
      
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
      
      // Fetch immediately on connection
      fetchPlayback();
      
      // Then set up interval - fetch every 1 second while connection is open
      const interval = setInterval(fetchPlayback, 1000);
      
      // Set up less frequent queue polling
      const queueInterval = setInterval(fetchQueue, 3000);
      
      // Clean up intervals when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(queueInterval);
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