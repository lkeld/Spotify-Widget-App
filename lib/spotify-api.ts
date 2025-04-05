import { logDebug, logError } from "./debug";
import { useRef } from "react";

// Cache configuration
const CACHE_TTL = {
  CURRENT_PLAYBACK: 2000, // 2 seconds (increased to reduce API load)
  QUEUE: 3000, // 3 seconds (increased to reduce API load)
  DEVICES: 30000, // 30 seconds
  TOP_TRACKS: 3600000, // 1 hour
  RECENTLY_PLAYED: 60000, // 1 minute
  AUDIO_FEATURES: 3600000, // 1 hour - audio features don't change
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
const apiCache: Record<string, CacheItem<any>> = {};

// Throttling configuration
const REQUEST_THROTTLE = {
  DEFAULT: 500, // ms between requests
};

// Last request timestamps for throttling
const lastRequestTime: Record<string, number> = {};

// Pending requests for deduplication
const pendingRequests: Record<string, Promise<any>> = {};

// Socket state for managing WebSocket communication
export type SocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Socket message types
export interface SpotifySocketMessage {
  type: 'playback' | 'queue' | 'devices' | 'ping' | 'error' | 'auth_success';
  data?: any;
  timestamp?: number;
}

/**
 * Make a throttled API request with caching
 */
async function makeRequest<T>(
  url: string,
  options: RequestInit = {},
  cacheKey: string,
  cacheTTL: number
): Promise<T> {
  const now = Date.now();
  
  // Check cache if this is a GET request
  if (options.method === undefined || options.method === "GET") {
    const cachedItem = apiCache[cacheKey];
    if (cachedItem && now - cachedItem.timestamp < cacheTTL) {
      logDebug(`Cache hit for ${cacheKey}`);
      return cachedItem.data as T;
    }
  }
  
  // Deduplicate in-flight requests
  if (pendingRequests[cacheKey] !== undefined) {
    logDebug(`Using pending request for ${cacheKey}`);
    return pendingRequests[cacheKey];
  }

  // Throttle requests
  const lastTime = lastRequestTime[cacheKey] || 0;
  const timeSinceLastRequest = now - lastTime;
  if (timeSinceLastRequest < REQUEST_THROTTLE.DEFAULT) {
    const delay = REQUEST_THROTTLE.DEFAULT - timeSinceLastRequest;
    logDebug(`Throttling request to ${url} for ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Update last request time
  lastRequestTime[cacheKey] = Date.now();
  
  // Make the request
  const requestPromise = fetch(url, options)
    .then(async (response) => {
      // Handle 204 (No Content) response
      if (response.status === 204) {
        if (url.includes("/player")) {
          return { is_playing: false } as T;
        }
        return null as T;
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the successful response for GET requests
      if (options.method === undefined || options.method === "GET") {
        apiCache[cacheKey] = { data, timestamp: Date.now() };
      } else {
        // For non-GET requests, invalidate related caches
        invalidateRelatedCaches(cacheKey);
      }
      
      return data as T;
    })
    .catch(error => {
      logError(`Error in request to ${url}:`, error);
      throw error;
    })
    .finally(() => {
      // Remove from pending requests
      delete pendingRequests[cacheKey];
    });
  
  // Store as pending request
  pendingRequests[cacheKey] = requestPromise;
  
  return requestPromise;
}

/**
 * Invalidate related caches when mutations occur
 */
function invalidateRelatedCaches(key: string) {
  if (key.includes("player")) {
    // Player actions affect current playback and queue
    delete apiCache["current-playback"];
    delete apiCache["queue"];
  }
}

/**
 * Clear specific cache entries
 */
export function clearCache(key?: string) {
  if (key) {
    delete apiCache[key];
  } else {
    // Clear all cache
    Object.keys(apiCache).forEach(k => delete apiCache[k]);
  }
}

/**
 * Prebatch multiple API requests that will be needed together
 * Returns a function that executes all requests when called
 */
export function batchRequests(requests: Array<() => Promise<any>>) {
  return async () => {
    return Promise.all(requests.map(req => req()));
  };
}

/**
 * Spotify API client with optimized methods
 */
export const spotifyApi = {
  // Player information
  getCurrentPlayback: async (accessToken: string) => {
    return makeRequest(
      "https://api.spotify.com/v1/me/player",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "current-playback",
      CACHE_TTL.CURRENT_PLAYBACK
    );
  },
  
  getQueue: async (accessToken: string) => {
    // Add timestamp to prevent browser caching
    const timestamp = Date.now();
    return makeRequest(
      `https://api.spotify.com/v1/me/player/queue?timestamp=${timestamp}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache",
        },
      },
      "queue",
      CACHE_TTL.QUEUE
    );
  },
  
  getDevices: async (accessToken: string) => {
    return makeRequest(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "devices",
      CACHE_TTL.DEVICES
    );
  },
  
  getTopTracks: async (accessToken: string, limit = 10, timeRange = "short_term") => {
    return makeRequest(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      `top-tracks-${timeRange}-${limit}`,
      CACHE_TTL.TOP_TRACKS
    );
  },
  
  getRecentlyPlayed: async (accessToken: string, limit = 20) => {
    return makeRequest(
      `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "recently-played",
      CACHE_TTL.RECENTLY_PLAYED
    );
  },
  
  getAudioFeatures: async (accessToken: string, trackId: string) => {
    return makeRequest(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      `audio-features-${trackId}`,
      CACHE_TTL.AUDIO_FEATURES
    );
  },
  
  // Player controls
  togglePlayback: async (accessToken: string, play?: boolean) => {
    const endpoint = play === undefined 
      ? `https://api.spotify.com/v1/me/player/${play ? 'play' : 'pause'}` 
      : 'https://api.spotify.com/v1/me/player/play';
    
    return makeRequest(
      endpoint,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "toggle-play",
      0
    );
  },
  
  skipToNext: async (accessToken: string) => {
    return makeRequest(
      "https://api.spotify.com/v1/me/player/next",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "skip-next",
      0
    );
  },
  
  skipToPrevious: async (accessToken: string) => {
    return makeRequest(
      "https://api.spotify.com/v1/me/player/previous",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "skip-previous",
      0
    );
  },
  
  setVolume: async (accessToken: string, volumePercent: number) => {
    return makeRequest(
      `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "set-volume",
      0
    );
  },
  
  seekToPosition: async (accessToken: string, positionMs: number) => {
    return makeRequest(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "seek",
      0
    );
  },
  
  transferPlayback: async (accessToken: string, deviceId: string, play = true) => {
    return makeRequest(
      "https://api.spotify.com/v1/me/player",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play,
        }),
      },
      "transfer-playback",
      0
    );
  },
  
  setShuffleState: async (accessToken: string, state: boolean) => {
    return makeRequest(
      `https://api.spotify.com/v1/me/player/shuffle?state=${state}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "set-shuffle",
      0
    );
  },
  
  setRepeatState: async (accessToken: string, state: string) => {
    return makeRequest(
      `https://api.spotify.com/v1/me/player/repeat?state=${state}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "set-repeat",
      0
    );
  },
  
  // User profile
  getCurrentUser: async (accessToken: string) => {
    return makeRequest(
      "https://api.spotify.com/v1/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "current-user",
      3600000 // 1 hour cache
    );
  },
};

// Create a message handler store
const messageHandlersRef = useRef<Record<string, Set<(data: any) => void>>>({
  playback: new Set(),
  queue: new Set(),
  devices: new Set(),
  ping: new Set(),
  error: new Set(),
  auth_success: new Set(),
}); 