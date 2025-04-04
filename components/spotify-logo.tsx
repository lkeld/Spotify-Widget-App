export function SpotifyLogo({ className = "" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none"
    >
      <circle cx="12" cy="12" r="11" fill="#1ED760" />
      <path d="M6.5 9.25C10.5 7.5 15 7.75 18 9C18.5 9.25 19 8.75 18.5 8.25C15 6.75 10 6.5 6 8.5C5.5 8.75 6 9.5 6.5 9.25Z" fill="white" />
      <path d="M6.5 12.25C10 10.75 13.5 11 16.5 12C17 12.25 17.25 11.75 16.75 11.5C13.5 10.25 9.5 10 6 11.75C5.5 12 6 12.5 6.5 12.25Z" fill="white" />
      <path d="M7 15.25C9.5 14.25 12 14.5 14 15.25C14.25 15.5 14.5 15 14.25 14.75C12 14 9.5 13.75 6.75 14.75C6.5 15 6.5 15.5 7 15.25Z" fill="white" />
    </svg>
  )
}

