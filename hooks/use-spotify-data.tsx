"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSpotifySocket } from "@/lib/spotify-socket"

// Define proper types for Spotify objects
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  [key: string]: any;
}

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  [key: string]: any;
}

interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
  [key: string]: any;
}

interface QueueResponse {
  currently_playing: SpotifyTrack | null;
  queue: SpotifyTrack[];
}

interface AudioFeatures {
  danceability: number;
  energy: number;
  key: number;
  tempo: number;
  [key: string]: any;
}

export function useSpotifyData() {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [currentDevice, setCurrentDevice] = useState<SpotifyDevice | null>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(50)
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedItem[]>([])
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null)
  const [shuffleState, setShuffleState] = useState(false)
  const [repeatState, setRepeatState] = useState("off")
  const [queue, setQueue] = useState<SpotifyTrack[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const lastUpdatedRef = useRef<number>(0)
  
  // Get the WebSocket connection
  const { socketState, subscribe } = useSpotifySocket()

  // Data fetch intervals (milliseconds) - now longer because we use WebSocket for real-time data
  const UPDATE_THRESHOLD = 1000 // Increased to reduce API load
  
  const fetchCurrentPlayback = useCallback(async () => {
    // Skip if we've fetched very recently to prevent overfetching
    const now = Date.now()
    if (now - lastUpdatedRef.current < UPDATE_THRESHOLD) return
    
    lastUpdatedRef.current = now
    
    try {
      const response = await fetch("/api/spotify/current-playback")
      if (!response.ok) return

      const data = await response.json()

      if (data.item) {
        setCurrentTrack(data.item)
        setIsPlaying(data.is_playing)
        setProgress(data.progress_ms)
        setDuration(data.item.duration_ms)
        setShuffleState(data.shuffle_state)
        setRepeatState(data.repeat_state)

        if (data.device) {
          setCurrentDevice(data.device)
        }
      }
    } catch (error) {
      console.error("Error fetching current playback:", error)
    }
  }, [])

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/devices")
      if (!response.ok) return

      const data = await response.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error("Error fetching devices:", error)
    }
  }, [])

  const fetchTopTracks = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/top-tracks")
      if (!response.ok) return

      const data = await response.json()
      setTopTracks(data.items || [])
    } catch (error) {
      console.error("Error fetching top tracks:", error)
    }
  }, [])

  const fetchRecentlyPlayed = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/recently-played")
      if (!response.ok) return

      const data = await response.json()
      setRecentlyPlayed(data.items || [])
    } catch (error) {
      console.error("Error fetching recently played:", error)
    }
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/queue")
      if (!response.ok) return

      const data: QueueResponse = await response.json()
      setQueue(data.queue || [])
    } catch (error) {
      console.error("Error fetching queue:", error)
    }
  }, [])

  const fetchAudioFeatures = useCallback(async (trackId: string) => {
    // Audio features API is deprecated, so let's provide fallback data directly
    // without making API requests
    if (!trackId) return
    
    setAudioFeatures({
      message: "Audio features unavailable",
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
    })
  }, [])

  const refreshData = useCallback(() => {
    // Immediate fetch for fastest refresh when user performs an action
    fetchCurrentPlayback()
    // Only fetch queue if WebSocket is not connected
    if (!wsConnected) {
      fetchQueue()
    }
  }, [fetchCurrentPlayback, fetchQueue, wsConnected])

  // Connect to WebSocket and handle real-time updates
  useEffect(() => {
    // Update websocket connection status
    setWsConnected(socketState === 'connected')
    
    // If connected, set up message handlers
    if (socketState === 'connected') {
      console.log('Setting up WebSocket message handlers')
      
      // Handle playback updates
      const unsubPlayback = subscribe('playback', (data: any) => {
        if (data.item) {
          setCurrentTrack(data.item)
          setIsPlaying(data.is_playing)
          setProgress(data.progress_ms)
          setDuration(data.item.duration_ms)
          setShuffleState(data.shuffle_state)
          setRepeatState(data.repeat_state)
          
          if (data.device) {
            setCurrentDevice(data.device)
          }
          
          // Update last updated timestamp
          lastUpdatedRef.current = Date.now()
          
          // Use the local fallback instead of API call
          if (data.item?.id) {
            fetchAudioFeatures(data.item.id)
          }
        }
      });
      
      // Handle queue updates
      const unsubQueue = subscribe('queue', (data: any) => {
        setQueue(data.queue || [])
      });
      
      // Handle device updates
      const unsubDevices = subscribe('devices', (data: any) => {
        setDevices(data.devices || [])
      });
      
      // Clean up subscriptions
      return () => {
        unsubPlayback();
        unsubQueue();
        unsubDevices();
      };
    }
  }, [socketState, subscribe, fetchAudioFeatures]);
  
  // Poll as fallback if WebSocket is not connected
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    
    if (!wsConnected) {
      // Fall back to regular polling if WebSocket not connected
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          // Only fetch data if the tab is visible
          const now = Date.now();
          
          // Only fetch if we haven't updated recently (prevents duplicate requests)
          if (now - lastUpdatedRef.current > UPDATE_THRESHOLD) {
            fetchCurrentPlayback();
            
            // Fetch queue less frequently to reduce API load
            if (now % 30000 < 100) { // Approximately every 30 seconds (increased from 15s)
              fetchQueue();
            }
          }
        }
      }, 10000) // Reduced polling frequency to 10 seconds (increased from 5s)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchCurrentPlayback, fetchQueue, wsConnected])
  
  // Initial data fetch and periodic updates for non-critical data
  useEffect(() => {
    // Initial data fetch staggered to prevent all requests at once
    const initialFetches = () => {
      setTimeout(() => fetchCurrentPlayback(), 0);
      setTimeout(() => fetchDevices(), 500);
      setTimeout(() => fetchTopTracks(), 1000);
      setTimeout(() => fetchRecentlyPlayed(), 1500);
      // Only fetch queue if WebSocket is not connected
      if (!wsConnected) {
        setTimeout(() => fetchQueue(), 2000);
      }
    };
    
    // Run initial fetches
    initialFetches();
    
    // Set up intervals for background updates of non-critical data
    const deviceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDevices();
      }
    }, 60000); // 1 minute (increased from 30s)
    
    const recentlyPlayedInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRecentlyPlayed();
      }
    }, 180000); // 3 minutes (increased from 1m)
    
    const topTracksInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTopTracks();
      }
    }, 600000); // 10 minutes (increased from 5m)
    
    // Refresh data when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCurrentPlayback();
        // Only fetch queue if WebSocket is not connected
        if (!wsConnected) {
          fetchQueue();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(deviceInterval);
      clearInterval(recentlyPlayedInterval);
      clearInterval(topTracksInterval);
    }
  }, [fetchCurrentPlayback, fetchDevices, fetchTopTracks, fetchRecentlyPlayed, fetchQueue, wsConnected])

  // Update progress in real-time when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined

    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev: number) => {
          if (prev >= duration) {
            clearInterval(interval)
            return 0
          }
          return prev + 50 // Update every 50ms for smoother progress
        })
      }, 50) // Changed from 1000ms to 50ms for more granular updates
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, duration])

  return {
    currentTrack,
    isPlaying,
    devices,
    currentDevice,
    progress,
    duration,
    volume,
    topTracks,
    recentlyPlayed,
    audioFeatures,
    shuffleState,
    repeatState,
    queue,
    refreshData,
    wsConnected
  }
}

