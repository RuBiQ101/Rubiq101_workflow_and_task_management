import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to the realtime WebSocket server
 * @param {string} token - JWT authentication token
 * @returns {Socket} Socket.IO client instance
 */
export function connectRealtime(token) {
  if (socket && socket.connected) {
    return socket;
  }

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

  socket = io(`${apiBase}/realtime`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Realtime] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Realtime] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Realtime] Connection error:', err.message);
  });

  socket.on('error', (error) => {
    console.error('[Realtime] Server error:', error);
  });

  return socket;
}

/**
 * Disconnect from the realtime server
 */
export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Realtime] Disconnected');
  }
}

/**
 * Subscribe to workspace, project, or task rooms
 * @param {Object} rooms - Object with workspaceId, projectId, and/or taskId
 */
export function subscribe(rooms = {}) {
  if (!socket) {
    console.warn('[Realtime] Cannot subscribe: not connected');
    return;
  }

  socket.emit('subscribe', rooms, (response) => {
    if (response?.ok) {
      console.log('[Realtime] Subscribed to:', rooms);
    } else {
      console.error('[Realtime] Subscription failed:', rooms);
    }
  });
}

/**
 * Unsubscribe from workspace, project, or task rooms
 * @param {Object} rooms - Object with workspaceId, projectId, and/or taskId
 */
export function unsubscribe(rooms = {}) {
  if (!socket) return;

  socket.emit('unsubscribe', rooms, (response) => {
    if (response?.ok) {
      console.log('[Realtime] Unsubscribed from:', rooms);
    }
  });
}

/**
 * Register an event listener
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 */
export function on(event, handler) {
  if (!socket) return;
  socket.on(event, handler);
}

/**
 * Remove an event listener
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 */
export function off(event, handler) {
  if (!socket) return;
  socket.off(event, handler);
}

/**
 * Get the current socket instance
 * @returns {Socket|null}
 */
export function getSocket() {
  return socket;
}
