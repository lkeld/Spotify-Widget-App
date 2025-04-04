"use client"

import { useState, useEffect, useCallback } from "react"

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

  const fetchCurrentPlayback = useCallback(async () => {
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

  const refreshData = useCallback(() => {
    fetchCurrentPlayback()
    fetchDevices()
    fetchQueue()

    // Short delay and re-fetch queue to ensure latest data after player actions
    setTimeout(() => {
      fetchQueue()
    }, 300)
  }, [fetchCurrentPlayback, fetchDevices, fetchQueue])

  // Initial data fetch
  useEffect(() => {
    fetchCurrentPlayback()
    fetchDevices()
    fetchTopTracks()
    fetchRecentlyPlayed()
    fetchQueue()
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
          return prev + 1000
        })
      }, 1000)
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
  }
}

