import { useCallback, useEffect, useRef, useState } from 'react';
import { spotifyApi, SocketState, SpotifySocketMessage } from './spotify-api';

// The WebSocket server URL - you'll need to replace this with your actual WebSocket server endpoint
// In a production environment, this would be a secure WebSocket server
const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';

/**
 * WebSocket client for Spotify real-time updates
 * This allows a single connection to handle all real-time events from Spotify
 */
export function useSpotifySocket() {
  const [socketState, setSocketState] = useState<SocketState>('disconnected');
  const [lastMessage, setLastMessage] = useState<SpotifySocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const accessTokenRef = useRef<string | null>(null);
  
  // Create a message handler store
  const messageHandlersRef = useRef<Record<string, Set<(data: any) => void>>>({
    playback: new Set(),
    queue: new Set(),
    devices: new Set(),
    ping: new Set(),
    error: new Set(),
    auth_success: new Set(),
  });
  
  // Authenticate with the WebSocket server
  const authenticate = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // If we don't have a cached token, fetch a new one
    if (!accessTokenRef.current) {
      try {
        // Get the token from the auth endpoint
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
          throw new Error('Failed to fetch access token');
        }
        
        const data = await response.json();
        accessTokenRef.current = data.accessToken;
      } catch (error) {
        console.error('Authentication error:', error);
        return false;
      }
    }
    
    // Send authentication message
    socketRef.current.send(JSON.stringify({
      type: 'auth',
      token: accessTokenRef.current
    }));
    
    return true;
  }, []);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    // Don't try to reconnect if we're already connected
    if (socketRef.current && socketRef.current.readyState === 0 || socketRef.current?.readyState === 1) {
      return;
    }
    
    try {
      setSocketState('connecting');
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setSocketState('connected');
        reconnectAttemptsRef.current = 0;
        
        // Authenticate immediately after connection
        authenticate().catch(err => {
          console.error('Failed to authenticate WebSocket:', err);
        });
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SpotifySocketMessage;
          // Add timestamp if not provided
          if (!message.timestamp) {
            message.timestamp = Date.now();
          }
          
          setLastMessage(message);
          
          // Handle auth success message
          if (message.type === 'auth_success') {
            console.log('WebSocket authenticated successfully');
          }
          
          // Dispatch to all registered handlers for this message type
          if (message.type && messageHandlersRef.current[message.type]) {
            messageHandlersRef.current[message.type].forEach(handler => {
              handler(message.data);
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setSocketState('disconnected');
        scheduleReconnect();
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setSocketState('error');
        socket.close();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setSocketState('error');
      scheduleReconnect();
    }
  }, [authenticate]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocketState('disconnected');
    
    // Clean up any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Schedule a reconnection attempt with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Exponential backoff with a maximum of 30 seconds
    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;
    
    console.log(`Scheduling WebSocket reconnection in ${backoffTime}ms`);
    reconnectTimeoutRef.current = setTimeout(() => {
      // Only reconnect if document is visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        connect();
      } else {
        // If document is not visible, wait until it becomes visible
        reconnectTimeoutRef.current = null;
      }
    }, backoffTime);
  }, [connect]);
  
  // Subscribe to a message type
  const subscribe = useCallback(<T = any>(
    type: SpotifySocketMessage['type'],
    handler: (data: T) => void
  ) => {
    if (!messageHandlersRef.current[type]) {
      messageHandlersRef.current[type] = new Set();
    }
    
    messageHandlersRef.current[type].add(handler as any);
    
    // Return unsubscribe function
    return () => {
      if (messageHandlersRef.current[type]) {
        messageHandlersRef.current[type].delete(handler as any);
      }
    };
  }, []);
  
  // Connect and disconnect based on document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'visible') {
          connect();
        } else {
          // Optional: You could disconnect when the page is hidden to save resources
          // disconnect();
        }
      }
    };
    
    // Initial connection
    connect();
    
    // Add visibility change listener
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Clean up
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    socketState,
    lastMessage,
    connect,
    disconnect,
    subscribe,
  };
} 