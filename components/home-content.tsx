"use client"

import { LoginButton } from "@/components/login-button"
import { SpotifyLogo } from "@/components/spotify-logo"
import { motion } from "framer-motion"

export function HomeContent({ 
  error, 
  errorDetails 
}: { 
  error?: string; 
  errorDetails?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050510] text-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center p-10 bg-gradient-to-br from-[#15152a] to-[#23233a] rounded-2xl shadow-2xl backdrop-blur-lg"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
        >
          <SpotifyLogo className="w-16 h-16 mx-auto mb-6" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold mb-2"
        >
          Spotify Music
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/60 mb-8"
        >
          Your personal music dashboard
        </motion.p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 mb-6 text-left backdrop-blur-md"
          >
            <h3 className="font-bold text-red-400">Authentication Error</h3>
            <p className="text-sm">{error.replace(/_/g, " ")}</p>
            {errorDetails && <p className="text-xs mt-2 text-red-300">{errorDetails}</p>}
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <LoginButton />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-xs text-white/30 bg-black/20 p-4 rounded-xl backdrop-blur-md"
        >
          <p>Make sure you have configured the environment variables:</p>
          <div className="mt-2 grid grid-cols-1 gap-1 font-mono">
            <div className="bg-white/5 p-1 rounded">SPOTIFY_CLIENT_ID</div>
            <div className="bg-white/5 p-1 rounded">SPOTIFY_CLIENT_SECRET</div>
            <div className="bg-white/5 p-1 rounded truncate">SPOTIFY_REDIRECT_URI</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
} 