import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function generateRandomString(length: number): string {
  let text = ""
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

