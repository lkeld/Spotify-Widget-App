"use client"

import { useState, useEffect, useCallback, useRef } from "react"

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
  const [sseConnected, setSseConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const lastUpdatedRef = useRef<number>(0)
  
  // Shorter polling interval (milliseconds) as fallback when SSE isn't working
  const SHORT_POLL_INTERVAL = 1000
  // Longer polling interval for non-critical data
  const LONG_POLL_INTERVAL = 30000
  // Threshold to prevent overfetching (milliseconds)
  const UPDATE_THRESHOLD = 500

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

        // Fetch audio features for current track
        fetchAudioFeatures(data.item.id)
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
    if (!trackId) return

    try {
      const response = await fetch(`/api/spotify/audio-features?id=${trackId}`)
      if (!response.ok) return

      const data = await response.json()
      setAudioFeatures(data)
    } catch (error) {
      console.error("Error fetching audio features:", error)
    }
  }, [])

  // Set up Server-Sent Events connection for real-time updates
  useEffect(() => {
    const connectSSE = () => {
      // Close previous connection if exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      // Create Server-Sent Events connection
      const eventSource = new EventSource('/api/spotify/events')
      eventSourceRef.current = eventSource
      
      eventSource.onopen = () => {
        console.log('SSE connected')
        setSseConnected(true)
      }
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle different types of updates
          if (data.type === 'playback') {
            if (data.data.item) {
              setCurrentTrack(data.data.item)
              setIsPlaying(data.data.is_playing)
              setProgress(data.data.progress_ms)
              setDuration(data.data.item.duration_ms)
              setShuffleState(data.data.shuffle_state)
              setRepeatState(data.data.repeat_state)
              
              if (data.data.device) {
                setCurrentDevice(data.data.device)
              }
              
              // Update last updated timestamp
              lastUpdatedRef.current = Date.now()
              
              // Fetch audio features if we have a current track
              if (data.data.item?.id) {
                fetchAudioFeatures(data.data.item.id)
              }
            }
          } else if (data.type === 'queue') {
            setQueue(data.data.queue || [])
          } else if (data.type === 'connected') {
            console.log('SSE connected and ready for data')
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        setSseConnected(false)
        
        // Attempt to reconnect if the document is visible
        if (document.visibilityState === 'visible') {
          setTimeout(() => {
            connectSSE()
          }, 3000)
        }
      }
    }
    
    // Initially connect SSE
    connectSSE()
    
    // Reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED)) {
        connectSSE()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [fetchAudioFeatures])

  const refreshData = useCallback(() => {
    // Immediate fetch for fastest refresh when user performs an action
    fetchCurrentPlayback()
    fetchQueue()
    
    // Short delay and re-fetch queue to ensure latest data after player actions
    setTimeout(() => {
      fetchQueue()
    }, 100) // Reduced from 300ms to 100ms for faster updates
  }, [fetchCurrentPlayback, fetchQueue])

  // Poll for playback updates if SSE is not connected
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    
    if (!sseConnected) {
      // Fall back to regular polling if SSE not connected
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchCurrentPlayback()
          fetchQueue()
        }
      }, SHORT_POLL_INTERVAL)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchCurrentPlayback, fetchQueue, sseConnected])
  
  // Poll for non-critical data less frequently
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    
    interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDevices()
        fetchRecentlyPlayed()
        fetchTopTracks()
      }
    }, LONG_POLL_INTERVAL)
    
    // Initial data fetch
    fetchCurrentPlayback()
    fetchDevices()
    fetchTopTracks()
    fetchRecentlyPlayed()
    fetchQueue()
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchCurrentPlayback, fetchDevices, fetchTopTracks, fetchRecentlyPlayed, fetchQueue])

  // Update progress in real-time when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            clearInterval(interval)
            return 0
          }
          return prev + 50 // Update every 50ms for smoother progress
        })
      }, 50) // Changed from 1000ms to 50ms for more granular updates
    }

    return () => clearInterval(interval)
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
    sseConnected,
  }
}

