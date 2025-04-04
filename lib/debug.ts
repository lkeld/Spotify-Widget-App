export function logDebug(message: string, data?: any) {
  console.log(`[DEBUG] ${message}`, data || "")
}

export function logError(message: string, error?: any) {
  console.error(`[ERROR] ${message}`, error || "")

  if (error instanceof Error) {
    console.error(`Stack: ${error.stack}`)
  }
}

