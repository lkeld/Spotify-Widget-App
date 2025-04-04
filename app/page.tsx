import { Suspense } from "react"
import { HomeContent } from "@/components/home-content"

interface SearchParams {
  error?: string;
  details?: string;
  message?: string;
}

// Server component to handle searchParams properly
export default async function Home({ 
  searchParams 
}: { 
  searchParams: SearchParams
}) {
  // Properly handle searchParams in Next.js 15+
  // Safely extract search parameters after awaiting
  const params = await Promise.resolve(searchParams);
  const error = params?.error;
  const errorDetails = params?.details || params?.message;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050510] flex items-center justify-center">Loading...</div>}>
      <HomeContent error={error} errorDetails={errorDetails} />
    </Suspense>
  )
}

