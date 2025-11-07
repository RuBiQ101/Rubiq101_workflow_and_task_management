import { useEffect, useRef } from 'react';
import { connectRealtime, subscribe, on, off } from '../api/realtime';

/**
 * React hook for managing WebSocket realtime connections
 * @param {string} token - JWT authentication token
 * @param {Object} rooms - Rooms to subscribe to { workspaceId, projectId, taskId }
 * @param {Object} handlers - Event handlers { 'event.name': handlerFn }
 */
export function useRealtime(token, rooms = {}, handlers = {}) {
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!token) {
      console.warn('[useRealtime] No token provided');
      return;
    }

    // Connect to realtime server
    const socket = connectRealtime(token);

    // Subscribe to rooms
    const roomsToSubscribe = Object.fromEntries(
      Object.entries(rooms).filter(([, value]) => value != null)
    );

    if (Object.keys(roomsToSubscribe).length > 0) {
      subscribe(roomsToSubscribe);
    }

    // Attach event handlers
    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      if (handler && typeof handler === 'function') {
        on(event, handler);
      }
    });

    // Cleanup function
    return () => {
      // Remove event handlers
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        if (handler && typeof handler === 'function') {
          off(event, handler);
        }
      });
    };
  }, [token, rooms.workspaceId, rooms.projectId, rooms.taskId]);
}
