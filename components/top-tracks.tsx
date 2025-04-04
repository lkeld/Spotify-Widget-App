"use client"

import Image from "next/image"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TopTracks({ tracks = [] }) {
  if (!tracks.length) {
    return <div className="text-center p-4 text-gray-400">Loading top tracks...</div>
  }

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => (
        <div key={track.id} className="flex items-center p-2 hover:bg-gray-900 rounded-md group">
          <div className="w-8 text-center text-gray-500 mr-3">{index + 1}</div>
          <div className="relative w-10 h-10 mr-3 flex-shrink-0">
            <Image
              src={track.album.images[2]?.url || "/placeholder.svg?height=40&width=40"}
              alt={track.album.name}
              fill
              className="object-cover rounded"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 h-full w-full flex items-center justify-center rounded"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-w-0 flex-grow">
            <div className="truncate font-medium">{track.name}</div>
            <div className="truncate text-xs text-gray-400">
              {track.artists.map((artist) => artist.name).join(", ")}
            </div>
          </div>
          <div className="text-xs text-gray-500 ml-2">{formatDuration(track.duration_ms)}</div>
        </div>
      ))}
    </div>
  )
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

