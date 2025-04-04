"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

// Create a motion-enabled version of SliderPrimitive.Thumb
const MotionThumb = motion(SliderPrimitive.Thumb)

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
      <SliderPrimitive.Range className="absolute h-full bg-white rounded-full" />
    </SliderPrimitive.Track>
    <MotionThumb 
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 1.4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-white shadow-md focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50" 
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
