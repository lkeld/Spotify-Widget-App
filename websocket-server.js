// WebSocket server for Spotify real-time updates
// Run this separately from the Next.js application
// Usage: node websocket-server.js

const WebSocket = require('ws');
const http = require('http');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const PORT = process.env.WS_SERVER_PORT || 3001;
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const UPDATE_INTERVAL = 1000; // 1 second interval for playback updates
const QUEUE_INTERVAL = 5000; // 5 second interval for queue updates
const DEVICES_INTERVAL = 30000; // 30 second interval for devices updates

// Initialize WebSocket server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// In-memory storage for access tokens and client sessions
const clients = new Map();
const tokenCache = new Map();

// Simple in-memory cache for API requests
const requestCache = new Map();
const cacheTTL = {
  playback: 1000,
  queue: 3000,
  devices: 10000
};

// Utility function to get cached data or fetch from API
async function getCachedOrFetch(type, accessToken, url) {
  const cacheKey = `${type}:${accessToken}`;
  const now = Date.now();
  const cached = requestCache.get(cacheKey);
  
  if (cached && now - cached.timestamp < cacheTTL[type]) {
    return cached.data;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.status === 204) {
      // No content, return empty object
      return {};
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    requestCache.set(cacheKey, {
      data,
      timestamp: now
    });
    
    return data;
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return null;
  }
}

// Connection handler
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  
  // Generate a unique client ID
  const clientId = Date.now().toString();
  let accessToken = null;
  let heartbeatInterval = null;
  let playbackInterval = null;
  let queueInterval = null;
  let devicesInterval = null;
  
  // Store client in map
  clients.set(clientId, {
    ws,
    accessToken,
    lastPlaybackId: null,
    lastQueueHash: null,
    lastPlayState: null
  });
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: Date.now()
  }));
  
  // Setup heartbeat to keep connection alive
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    }
  }, 30000); // 30 second ping
  
  // Handle authentication message
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'auth') {
        // Store the token and start data fetching
        accessToken = data.token;
        clients.get(clientId).accessToken = accessToken;
        
        // Fetch initial data
        fetchAndSendPlaybackData(clientId);
        fetchAndSendQueueData(clientId);
        fetchAndSendDevicesData(clientId);
        
        // Set up regular intervals for data updates
        playbackInterval = setInterval(() => fetchAndSendPlaybackData(clientId), UPDATE_INTERVAL);
        queueInterval = setInterval(() => fetchAndSendQueueData(clientId), QUEUE_INTERVAL);
        devicesInterval = setInterval(() => fetchAndSendDevicesData(clientId), DEVICES_INTERVAL);
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'auth_success',
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      
      // Send error to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now()
        }));
      }
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Clean up intervals
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (playbackInterval) clearInterval(playbackInterval);
    if (queueInterval) clearInterval(queueInterval);
    if (devicesInterval) clearInterval(devicesInterval);
    
    // Remove client from map
    clients.delete(clientId);
  });
});

// Fetch and send playback data to a client
async function fetchAndSendPlaybackData(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.accessToken || client.ws.readyState !== WebSocket.OPEN) return;
  
  try {
    const data = await getCachedOrFetch(
      'playback',
      client.accessToken,
      `${SPOTIFY_API_BASE}/me/player`
    );
    
    if (!data) return;
    
    // Check if meaningful changes have occurred to avoid unnecessary updates
    const currentTrackId = data.item?.id || null;
    const isPlaying = data.is_playing || false;
    
    if (currentTrackId !== client.lastPlaybackId || isPlaying !== client.lastPlayState) {
      client.ws.send(JSON.stringify({
        type: 'playback',
        data,
        timestamp: Date.now()
      }));
      
      // Update stored state
      client.lastPlaybackId = currentTrackId;
      client.lastPlayState = isPlaying;
    }
  } catch (error) {
    console.error('Error sending playback data:', error);
  }
}

// Fetch and send queue data to a client
async function fetchAndSendQueueData(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.accessToken || client.ws.readyState !== WebSocket.OPEN) return;
  
  try {
    const data = await getCachedOrFetch(
      'queue',
      client.accessToken,
      `${SPOTIFY_API_BASE}/me/player/queue`
    );
    
    if (!data) return;
    
    // Create a simple hash of the queue to detect changes
    const queueHash = data.queue
      ? data.queue.map(t => t.id).join('|')
      : '';
    
    if (queueHash !== client.lastQueueHash) {
      client.ws.send(JSON.stringify({
        type: 'queue',
        data,
        timestamp: Date.now()
      }));
      
      // Update stored state
      client.lastQueueHash = queueHash;
    }
  } catch (error) {
    console.error('Error sending queue data:', error);
  }
}

// Fetch and send devices data to a client
async function fetchAndSendDevicesData(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.accessToken || client.ws.readyState !== WebSocket.OPEN) return;
  
  try {
    const data = await getCachedOrFetch(
      'devices',
      client.accessToken,
      `${SPOTIFY_API_BASE}/me/player/devices`
    );
    
    if (!data) return;
    
    client.ws.send(JSON.stringify({
      type: 'devices',
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error sending devices data:', error);
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 