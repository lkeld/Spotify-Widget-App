"use client"

import Image from "next/image"
import { Play, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RecentlyPlayed({ tracks = [] }) {
  if (!tracks.length) {
    return <div className="text-center p-4 text-gray-400">Loading recently played...</div>
  }

  return (
    <div className="space-y-1">
      {tracks.map((item, index) => (
        <div key={`${item.track.id}-${index}`} className="flex items-center p-2 hover:bg-gray-900 rounded-md group">
          <div className="relative w-10 h-10 mr-3 flex-shrink-0">
            <Image
              src={item.track.album.images[2]?.url || "/placeholder.svg?height=40&width=40"}
              alt={item.track.album.name}
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
            <div className="truncate font-medium">{item.track.name}</div>
            <div className="truncate text-xs text-gray-400">
              {item.track.artists.map((artist) => artist.name).join(", ")}
            </div>
          </div>
          <div className="text-xs text-gray-500 ml-2 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatTimeAgo(new Date(item.played_at))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTimeAgo(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

