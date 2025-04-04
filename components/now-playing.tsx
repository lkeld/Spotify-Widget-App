"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Heart, Repeat, Shuffle, SkipBack, Play, Pause, SkipForward } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getPaletteFromURL } from "@/lib/colors"

interface Artist {
  name: string;
}

interface AlbumImage {
  url: string;
}

interface Album {
  name: string;
  images: AlbumImage[];
}

interface Track {
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
}

interface NowPlayingProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  nextTrack?: Track | null;
  onReplayTrack?: () => void;
  onTogglePlay?: () => void;
  onSkipNext?: () => void;
  onSkipPrevious?: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  shuffleState?: boolean;
  repeatState?: string;
  isLoadingAction?: string | null;
}

export function NowPlaying({ 
  track, 
  isPlaying, 
  progress, 
  duration, 
  nextTrack = null,
  onReplayTrack,
  onTogglePlay,
  onSkipNext,
  onSkipPrevious,
  onToggleShuffle,
  onToggleRepeat,
  shuffleState,
  repeatState,
  isLoadingAction
}: NowPlayingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const animationStateRef = useRef<number[]>([])
  const prevPlayingStateRef = useRef(isPlaying)
  const animationFrameRef = useRef<number | null>(null)
  const [backgroundColors, setBackgroundColors] = useState<string[]>(['#151525', '#232340'])
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('')
  
  // Extract colors from album art
  useEffect(() => {
    if (track?.album?.images?.[0]?.url && track.album.images[0].url !== currentImageUrl) {
      const imageUrl = track.album.images[0].url
      setCurrentImageUrl(imageUrl)
      
      // Get palette from album art
      getPaletteFromURL(imageUrl)
        .then((colors: string[]) => {
          if (colors && colors.length >= 2) {
            // Usually the first color is the most dominant
            // We want to use a darker version of it for the base background
            setBackgroundColors([
              colors[0], 
              colors[1]
            ])
          }
        })
        .catch((err: Error) => {
          console.error("Error extracting palette:", err)
        })
    }
  }, [track, currentImageUrl])
  
  // Audio visualizer effect
  useEffect(() => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high quality rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    const width = canvas.width
    const height = canvas.height
    
    // Better visualizer with smoother, more organic design
    // Using a circular/wave-like pattern instead of bars
    const pointCount = 80  // More points for smoother curve
    
    // Initialize animation state if not set
    if (animationStateRef.current.length === 0 || animationStateRef.current.length !== pointCount) {
      animationStateRef.current = Array(pointCount).fill(0).map(() => 0.2)
    }
    
    let lastTime = 0
    const animationStart = performance.now()
    
    // Generate more natural and fluid wave pattern
    const generateWavePoint = (t: number, i: number, total: number, timePos: number) => {
      const normalizedPos = i / (total - 1)
      
      // Use a wave-like pattern with multiple frequencies
      const phaseShift = normalizedPos * Math.PI * 2
      const timeVariation = t * 0.0003
      const songProgress = timePos * 0.04
      
      // Create layered frequencies with subtle phase differences
      const baseWave = Math.sin(timeVariation + songProgress * 0.05 + phaseShift * 1.2) * 0.3
      const detailWave = Math.sin(timeVariation * 2.1 + songProgress * 0.02 + phaseShift * 3.7) * 0.1
      const microDetail = Math.sin(timeVariation * 3.5 + songProgress * 0.01 + phaseShift * 5.3) * 0.05
      
      // Create a gentle flowing center emphasis with mirror effect
      const mirrorEffect = Math.abs(normalizedPos - 0.5) * 2
      const centerEmphasis = (1 - Math.pow(mirrorEffect, 1.8)) * 0.2
      
      // Combine all components with weighted blending
      let value = 0.35 + centerEmphasis + baseWave + detailWave * (isPlaying ? 1 : 0.3) + microDetail * (isPlaying ? 1 : 0.1)
      
      // Ensure it stays in reasonable range
      return Math.max(0.15, Math.min(0.85, value))
    }
    
    const render = (timestamp: number) => {
      // Calculate delta time for smooth animation
      const deltaTime = Math.min(16, timestamp - lastTime) 
      lastTime = timestamp
      
      // Time since animation started (for patterns)
      const animTime = timestamp - animationStart
      
      // Get current position in song as percentage
      const timePosition = (progress / duration) * 100 || 0
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      // Define centerHeight only once at the top of the render function
      const centerHeight = height / 2;
      
      // Update animation state with smoother transition
      const baseTransitionSpeed = isPlaying ? 0.06 : 0.03
      const transitionBoost = prevPlayingStateRef.current !== isPlaying ? 1.5 : 1
      const transitionSpeed = baseTransitionSpeed * transitionBoost
      
      // Remember playing state for next frame
      prevPlayingStateRef.current = isPlaying
      
      // Generate points for the wave
      const points: [number, number][] = []
      
      for (let i = 0; i < pointCount; i++) {
        // Generate target amplitude
        let targetAmplitude: number
        
        if (isPlaying) {
          // Get the target amplitude using our wave pattern generator
          targetAmplitude = generateWavePoint(animTime, i, pointCount, timePosition)
        } else {
          // When paused, create a subtle breathing sine wave
          const normalizedPos = i / (pointCount - 1)
          const phasePos = Math.abs(normalizedPos - 0.5) * 2
          const breathingRate = animTime * 0.0004
          targetAmplitude = 0.4 + Math.sin(breathingRate) * 0.05 * (1 - phasePos * 0.7)
        }
        
        // Apply smooth transition between states
        let currentAmplitude = animationStateRef.current[i]
        const transitionAmount = Math.min(1, (deltaTime / 16) * transitionSpeed)
        currentAmplitude += (targetAmplitude - currentAmplitude) * transitionAmount
        
        // Update state
        animationStateRef.current[i] = currentAmplitude
        
        // Calculate point position
        const x = (width * i) / (pointCount - 1)
        const amplitude = currentAmplitude * centerHeight * 0.8
        const y = centerHeight - amplitude
        
        points.push([x, y])
      }
      
      // Mirror the wave to create a symmetrical pattern
      const mirroredPoints: [number, number][] = [...points]
      for (let i = 0; i < pointCount; i++) {
        const [x, y] = points[i]
        const mirrorY = height - (y - centerHeight) - centerHeight
        mirroredPoints.push([x, mirrorY])
      }
      
      // Draw the wave
      ctx.beginPath()
      
      // Start with the first point
      ctx.moveTo(points[0][0], points[0][1])
      
      // Draw smooth curve through points using bezier curves
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i]
        const [x2, y2] = points[i + 1]
        
        // Calculate control points for smooth curve
        const cp1x = x1 + (x2 - x1) / 3
        const cp1y = y1
        const cp2x = x1 + (x2 - x1) * 2 / 3
        const cp2y = y2
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2)
      }
      
      // Continue with mirrored points (bottom half)
      for (let i = pointCount; i < mirroredPoints.length; i++) {
        const [x, y] = mirroredPoints[i]
        ctx.lineTo(x, y)
      }
      
      // Close the path
      ctx.lineTo(points[0][0], points[0][1])
      
      // Create a beautiful gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)')
      
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Add a subtle glow effect
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)'
      ctx.shadowBlur = 10
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1
      ctx.stroke()
      
      animationFrameRef.current = requestAnimationFrame(render)
    }
    
    animationFrameRef.current = requestAnimationFrame(render)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, progress, duration])
  
  if (!track) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#151525] rounded-xl overflow-hidden relative">
        <p className="text-white/60 font-medium">Nothing playing right now</p>
      </div>
    )
  }
  
  // Calculate progress percentage
  const progressPercent = (progress / duration) * 100 || 0

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="w-full h-full rounded-2xl overflow-hidden relative flex"
      style={{
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        minHeight: '300px', // Ensure minimum height to prevent control clipping
      }}
    >
      {/* Dynamic background with gradient based on album art */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={track.album.images[0]?.url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-br rounded-2xl"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${backgroundColors[0]}cc, ${backgroundColors[1]}99)` 
              }}
          />
          <Image
            src={track.album.images[0]?.url || "/placeholder.svg"}
            alt=""
            fill
            className="object-cover mix-blend-overlay opacity-25 blur-[10px]"
          />
          <div className="absolute inset-0 bg-[#0F0F1A]/30 backdrop-blur-[5px] rounded-2xl" />
          {/* Add subtle inner shadow to create depth */}
          <div className="absolute inset-0 shadow-inner rounded-2xl" 
            style={{
              boxShadow: 'inset 0 1px 8px rgba(255,255,255,0.1), inset 0 -4px 10px rgba(0,0,0,0.3)'
            }} 
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row px-7 py-6">
        {/* Album artwork */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex-shrink-0 mr-0 md:mr-7 mb-4 md:mb-0 self-center"
        >
          <div className="relative h-[90px] md:h-[110px] w-[90px] md:w-[110px] rounded-xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
            <Image
              src={track.album.images[0]?.url || "/placeholder.svg"}
              alt={track.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 border border-white/10 rounded-xl" />
          </div>
        </motion.div>
        
        {/* Main content with proper spacing */}
        <div className="flex-1 flex flex-col justify-between h-full">
          {/* Header with track info */}
          <div className="mb-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-white/80 mb-1"
            >
              {track.artists.map((artist) => artist.name).join(", ")}
            </motion.div>
            
            <motion.h2 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold text-white line-clamp-1"
            >
              {track.name}
            </motion.h2>
          </div>
          
          {/* Visualizer section with proper spacing */}
          <div className="mb-auto mt-1">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full relative"
            >
              {/* Updated visualizer canvas with better height proportion */}
              <canvas
                ref={canvasRef}
                width={600}
                height={60}
                className="w-full h-[60px]"
              />
              
              {/* Progress bar - more elegant styling */}
              <div className="h-1.5 w-full bg-white/10 rounded-full mt-3 mb-2 overflow-hidden backdrop-blur-sm">
                <motion.div 
                  className="h-full bg-white/90 rounded-full"
                  style={{ 
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 8px rgba(255,255,255,0.5)' 
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: "tween", ease: "linear", duration: 0.2 }}
                />
              </div>
              
              {/* Timestamps */}
              <div className="flex justify-between text-xs font-medium text-white/70">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </motion.div>
          </div>
          
          {/* Controls and next track preview with clear separation */}
          <div className="flex flex-wrap justify-between items-center mt-5 mb-2">
            {/* Like and replay buttons on smaller screens, moved to different position on larger screens */}
            <div className="flex space-x-3 items-center mb-2 md:mb-0 order-2 md:order-1">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsLiked(!isLiked)}
                className="rounded-full p-2 bg-white/10 backdrop-blur-sm"
              >
                <Heart 
                  className={`h-4 w-4 ${isLiked ? 'fill-white text-white' : 'text-white/90'}`}
                  strokeWidth={2}
                />
              </motion.button>

              {/* Replay button moved here on mobile for better layout */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReplayTrack}
                className="rounded-full p-2 bg-white/10 backdrop-blur-sm md:hidden"
              >
                <Repeat
                  className="h-4 w-4 text-white/90"
                  strokeWidth={2}
                />
              </motion.button>
            </div>
            
            {/* Integrated control buttons */}
            <div className="flex items-center justify-center space-x-4 order-1 md:order-2 w-full md:w-auto mb-3 md:mb-0">
              {/* Shuffle button */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`text-white/60 hover:text-white transition-colors ${shuffleState ? 'text-white' : ''}`}
                onClick={onToggleShuffle}
              >
                <Shuffle className="h-4 w-4" />
              </motion.button>
              
              {/* Previous button */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white/90 hover:text-white transition-colors"
                onClick={onSkipPrevious}
                disabled={isLoadingAction === 'previous'}
              >
                <SkipBack className="h-5 w-5" />
              </motion.button>
              
              {/* Play/Pause button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onTogglePlay}
                className="bg-white rounded-full h-10 w-10 flex items-center justify-center text-[#0A0A14] shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                disabled={isLoadingAction === 'toggle-play'}
              >
                {isPlaying ? 
                  <Pause className="h-5 w-5" /> : 
                  <Play className="h-5 w-5 ml-0.5" />
                }
              </motion.button>
              
              {/* Next button */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white/90 hover:text-white transition-colors"
                onClick={onSkipNext}
                disabled={isLoadingAction === 'next'}
              >
                <SkipForward className="h-5 w-5" />
              </motion.button>
              
              {/* Repeat button */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`text-white/60 hover:text-white transition-colors ${repeatState !== 'off' ? 'text-white' : ''}`}
                onClick={onToggleRepeat}
              >
                <Repeat className="h-4 w-4" />
              </motion.button>
            </div>
            
            {/* Reply button moved here and next track info */}
            <div className="flex items-center order-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReplayTrack}
                className="rounded-full p-2 bg-white/10 backdrop-blur-sm mr-2 hidden md:flex"
              >
                <Repeat
                  className="h-4 w-4 text-white/90"
                  strokeWidth={2}
                />
              </motion.button>
              
              {nextTrack && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center"
                >
                  <div className="text-[10px] font-medium text-white/60 uppercase mr-2">
                    Next
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative w-10 h-10 rounded-md overflow-hidden group"
                  >
                    <Image
                      src={nextTrack.album.images[0]?.url || "/placeholder.svg"}
                      alt={nextTrack.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/15" />
                    
                    {/* Enhanced tooltip for next track info */}
                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out bottom-full right-0 mb-2 w-60 bg-black/80 backdrop-blur-lg text-white text-xs p-3 rounded-md shadow-lg pointer-events-none border border-white/10 z-20">
                      <div className="flex items-center mb-1.5">
                        <div className="text-[10px] font-semibold text-white/60 uppercase mr-1">
                          Up Next:
                        </div>
                        <div className="h-px flex-grow bg-white/20 ml-1"></div>
                      </div>
                      <p className="font-bold truncate text-sm">{nextTrack.name}</p>
                      <p className="text-white/70 truncate mb-1">{nextTrack.artists.map(a => a.name).join(', ')}</p>
                      <div className="flex justify-between text-white/50 text-[10px] mt-2">
                        <span>Album: {nextTrack.album.name}</span>
                        <span>{formatTime(nextTrack.duration_ms)}</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function formatTime(ms: number): string {
  if (!ms) return "0:00"
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

