"use client"

import { useState, useCallback, useEffect } from "react"

// Enums for better type safety
export enum RepeatState {
  OFF = "off",
  CONTEXT = "context",
  TRACK = "track"
}

export function usePlayerControls() {
  const [shuffleState, setShuffleState] = useState(false)
  const [repeatState, setRepeatState] = useState<RepeatState>(RepeatState.OFF)
  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Initialize states from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedShuffle = localStorage.getItem('spotify_shuffle_state')
        const storedRepeat = localStorage.getItem('spotify_repeat_state')
        
        if (storedShuffle) setShuffleState(storedShuffle === 'true')
        if (storedRepeat && Object.values(RepeatState).includes(storedRepeat as RepeatState)) {
          setRepeatState(storedRepeat as RepeatState)
        }
      } catch (err) {
        console.error("Error reading from localStorage:", err)
      }
    }
  }, [])

  // Helper to manage API request state
  const performAction = useCallback(async (
    actionName: string, 
    apiCall: () => Promise<Response>,
    onSuccess?: () => void,
    onRevert?: () => void
  ) => {
    setIsLoadingAction(actionName)
    setActionError(null)
    
    try {
      const response = await apiCall()
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      
      // Save to localStorage if relevant
      if (actionName === 'shuffle') {
        localStorage.setItem('spotify_shuffle_state', String(shuffleState))
      } else if (actionName === 'repeat') {
        localStorage.setItem('spotify_repeat_state', repeatState)
      }
      
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(`Error with ${actionName}:`, error)
      setActionError(actionName)
      if (onRevert) onRevert()
    } finally {
      setIsLoadingAction(null)
    }
  }, [shuffleState, repeatState])

  const togglePlay = useCallback(async (onSuccess?: () => void) => {
    await performAction(
      'toggle-play',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "toggle-play" }),
      }),
      onSuccess
    )
  }, [performAction])

  const skipNext = useCallback(async (onSuccess?: () => void) => {
    await performAction(
      'next',
      () => fetch("/api/spotify/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "next" }),
      }),
      () => {
        // Add a small delay before calling onSuccess to allow Spotify to update
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 200);
      }
    )
  }, [performAction])

  const skipPrevious = useCallback(async (onSuccess?: () => void) => {
    await performAction(
      'previous',
      () => fetch("/api/spotify/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "previous" }),
      }),
      () => {
        // Add a small delay before calling onSuccess to allow Spotify to update
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 200);
      }
    )
  }, [performAction])

  const setVolume = useCallback(async (volumePercent: number) => {
    await performAction(
      'volume',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "volume",
          volume_percent: volumePercent,
        }),
      })
    )
  }, [performAction])

  const seekPosition = useCallback(async (positionMs: number) => {
    await performAction(
      'seek',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seek",
          position_ms: positionMs,
        }),
      })
    )
  }, [performAction])

  const transferPlayback = useCallback(async (deviceId: string) => {
    await performAction(
      'transfer',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "transfer",
          device_id: deviceId,
        }),
      })
    )
  }, [performAction])

  const toggleShuffle = useCallback(async (onSuccess?: () => void) => {
    const newState = !shuffleState
    setShuffleState(newState)

    await performAction(
      'shuffle',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "shuffle",
          state: newState,
        }),
      }),
      onSuccess, 
      () => setShuffleState(!newState) // Revert if failed
    )
  }, [shuffleState, performAction])

  const toggleRepeat = useCallback(async (onSuccess?: () => void) => {
    const states = [RepeatState.OFF, RepeatState.CONTEXT, RepeatState.TRACK]
    const currentIndex = states.indexOf(repeatState)
    const newState = states[(currentIndex + 1) % states.length]

    // Optimistically update state
    const oldState = repeatState
    setRepeatState(newState)

    await performAction(
      'repeat',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "repeat",
          state: newState,
        }),
      }),
      onSuccess,
      () => setRepeatState(oldState) // Revert if failed
    )
  }, [repeatState, performAction])

  const replayTrack = useCallback(async (onSuccess?: () => void) => {
    await performAction(
      'replay',
      () => fetch("/api/spotify/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seek",
          position_ms: 0,
        }),
      }),
      onSuccess
    )
  }, [performAction])

  return {
    togglePlay,
    skipNext,
    skipPrevious,
    setVolume,
    seekPosition,
    transferPlayback,
    toggleShuffle,
    toggleRepeat,
    replayTrack,
    shuffleState,
    repeatState,
    isLoadingAction,
    actionError,
  }
}

