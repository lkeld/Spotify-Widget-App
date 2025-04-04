"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  ArrowUpRight,
  Music2,
  Repeat,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { NowPlaying } from "@/components/now-playing"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { useSpotifyData } from "@/hooks/use-spotify-data"

// Types for Spotify tracks
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  [key: string]: any;
}

interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
  [key: string]: any;
}

export function Dashboard() {
  const router = useRouter()
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    refreshData,
    topTracks,
    recentlyPlayed,
    queue
  } = useSpotifyData()
  
  const [lastTrackId, setLastTrackId] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const {
    togglePlay,
    skipNext,
    skipPrevious,
    toggleShuffle,
    toggleRepeat,
    replayTrack,
    shuffleState,
    repeatState,
    isLoadingAction,
  } = usePlayerControls()

  // Create wrapped skip functions that refresh data after completion
  const handleSkipNext = useCallback(() => {
    skipNext(refreshData);
  }, [skipNext, refreshData]);

  const handleSkipPrevious = useCallback(() => {
    skipPrevious(refreshData);
  }, [skipPrevious, refreshData]);

  // Create wrapped toggle functions that refresh data after completion
  const handleToggleShuffle = useCallback(() => {
    toggleShuffle(refreshData);
  }, [toggleShuffle, refreshData]);

  const handleToggleRepeat = useCallback(() => {
    toggleRepeat(refreshData);
  }, [toggleRepeat, refreshData]);

  const handleTogglePlay = useCallback(() => {
    togglePlay(refreshData);
  }, [togglePlay, refreshData]);

  const handleReplayTrack = useCallback(() => {
    replayTrack(refreshData);
  }, [replayTrack, refreshData]);

  // Track change detection for smooth transitions
  useEffect(() => {
    if (currentTrack?.id && currentTrack.id !== lastTrackId) {
      setIsTransitioning(true)
      setLastTrackId(currentTrack.id)
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [currentTrack, lastTrackId])

  // Get the next track to display from queue instead of recent plays
  const getNextTrack = () => {
    if (!currentTrack || !queue || queue.length === 0) {
      return null;
    }
    
    // Return the first track in the queue
    return queue[0];
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  // Refresh data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 5000)

    return () => clearInterval(interval)
  }, [refreshData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A14] to-[#12121F] flex items-center justify-center p-4 md:p-6">
      {/* Ambient background glow */}
      <AnimatePresence>
        <motion.div 
          key={`glow-${lastTrackId}`}
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="fixed inset-0 overflow-hidden pointer-events-none z-0"
        >
          {/* Remove fixed color backgrounds and rely solely on album art */}
          {currentTrack?.album?.images?.[0]?.url && (
            <div 
              className="absolute inset-0 opacity-40 mix-blend-soft-light"
              style={{
                backgroundSize: '400% 400%',
                backgroundPosition: 'center',
                filter: 'blur(120px)',
                transform: 'scale(1.2)',
                backgroundImage: `url(${currentTrack.album.images[0].url})`
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="w-full max-w-xl bg-black/30 rounded-2xl overflow-visible md:overflow-hidden relative backdrop-blur-md flex flex-col mt-[-80px] md:mt-0"
        style={{ 
          maxHeight: '570px',
          boxShadow: '0 25px 50px -20px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Subtle inner glow effect */}
        <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
        
        {/* Header bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex justify-between items-center p-4 px-6 relative z-10 bg-transparent"
        >
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-black/15 backdrop-blur-sm p-2">
              <Image 
                src="/spotify-logo.svg" 
                alt="Spotify" 
                width={16} 
                height={16}
                className="object-contain"
              />
            </div>
            <h1 className="text-white text-sm font-medium">Spotify Music</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.05, 1] : 1,
                opacity: isPlaying ? [1, 0.8, 1] : 0.6
              }}
              transition={{
                duration: 1.4,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "loop"
              }}
              className="text-white/80 mr-1"
            >
              <Music2 className="h-4 w-4" />
            </motion.div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
        
        {/* Main player area with animated transitions */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={`player-${lastTrackId}`}
            initial={{ opacity: isTransitioning ? 0 : 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full px-5 py-3 flex-1"
          >
            <NowPlaying 
              track={currentTrack} 
              isPlaying={isPlaying} 
              progress={progress} 
              duration={duration}
              nextTrack={getNextTrack()}
              onTogglePlay={handleTogglePlay}
              onSkipNext={handleSkipNext}
              onSkipPrevious={handleSkipPrevious}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onReplayTrack={handleReplayTrack}
              shuffleState={shuffleState}
              repeatState={repeatState}
              isLoadingAction={isLoadingAction}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

