"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Music } from "lucide-react"

export function LoginButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/auth/login", {
        method: "GET",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate login")
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No authorization URL returned")
      }
    } catch (error: any) {
      console.error("Login failed:", error)
      setError(error.message || "Failed to connect with Spotify")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        disabled={isLoading}
        onClick={handleLogin}
        className="bg-[#1ED760] text-[#15152a] font-medium py-3 px-6 rounded-full w-full flex items-center justify-center space-x-2 shadow-xl"
      >
        {isLoading ? (
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-5 w-5 border-2 border-[#15152a] border-t-transparent rounded-full"
          />
        ) : (
          <>
            <Music className="h-5 w-5" />
            <span>Connect with Spotify</span>
          </>
        )}
      </motion.button>

      {error && (
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 mt-3 text-sm"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

