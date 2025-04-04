"use client"

import { Laptop, Smartphone, Speaker, Tv, Monitor, Headphones } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function DeviceSelector({ devices = [], currentDevice, onDeviceSelect }) {
  if (!devices.length) {
    return null
  }

  const getDeviceIcon = (type) => {
    switch (type) {
      case "Computer":
        return <Laptop className="h-4 w-4 mr-2" />
      case "Smartphone":
        return <Smartphone className="h-4 w-4 mr-2" />
      case "Speaker":
        return <Speaker className="h-4 w-4 mr-2" />
      case "TV":
        return <Tv className="h-4 w-4 mr-2" />
      case "Headphones":
        return <Headphones className="h-4 w-4 mr-2" />
      default:
        return <Monitor className="h-4 w-4 mr-2" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          {getDeviceIcon(currentDevice?.type)}
          {currentDevice?.name || "Select Device"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {devices.map((device) => (
          <DropdownMenuItem
            key={device.id}
            onClick={() => onDeviceSelect(device.id)}
            className={device.id === currentDevice?.id ? "bg-gray-800" : ""}
          >
            {getDeviceIcon(device.type)}
            {device.name}
            {device.is_active && " (Active)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

