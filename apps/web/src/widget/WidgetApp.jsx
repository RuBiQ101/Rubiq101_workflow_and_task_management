/**
 * Workflo Widget Application
 * 
 * This is the main widget bundle that gets loaded by the embed script.
 * It provides a floating widget interface for task management.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';

function WidgetApp({ config }) {
  const [session, setSession] = useState(null);
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const socketRef = useRef(null);

  // Initialize widget: exchange pageToken for JWT
  useEffect(() => {
    async function initWidget() {
      try {
        setLoading(true);
        setError(null);

        // Exchange pageToken for ephemeral JWT
        const sessionRes = await fetch(`${config.apiBase}/widget/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageToken: config.pageToken }),
        });

        if (!sessionRes.ok) {
          throw new Error('Failed to create widget session');
        }

        const sessionData = await sessionRes.json();
        setSession(sessionData);

        // Fetch widget configuration
        const configRes = await fetch(`${config.apiBase}/widget/config/${sessionData.orgId}`);
        const configData = await configRes.json();
        setWidgetConfig(configData);

        // Initialize WebSocket connection
        initializeSocket(sessionData.jwt);

        setLoading(false);
      } catch (err) {
        console.error('Widget initialization error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    if (config.pageToken) {
      initWidget();
    }

    return () => {
      // Cleanup socket on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [config.pageToken, config.apiBase]);

  // Initialize Socket.IO connection
  function initializeSocket(jwt) {
    const socket = io(`${config.wsBase || config.apiBase}/realtime`, {
      auth: { token: jwt },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Widget: Socket connected');
    });

    socket.on('task.created', (task) => {
      console.log('Widget: Task created', task);
      setTasks(prev => [...prev, task]);
    });

    socket.on('task.updated', (task) => {
      console.log('Widget: Task updated', task);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    });

    socket.on('task.deleted', ({ taskId }) => {
      console.log('Widget: Task deleted', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    });

    socket.on('disconnect', () => {
      console.log('Widget: Socket disconnected');
    });

    socketRef.current = socket;
  }

  // Create a new task
  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !session) return;

    try {
      const res = await fetch(`${config.apiBase}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.jwt}`,
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: 'Created via widget',
        }),
      });

      if (res.ok) {
        setNewTaskTitle('');
        // Task will be added via socket event
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }

  if (loading) {
    return (
      <div className="workflo-widget" style={styles.widget}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>Loading Workflo...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflo-widget" style={styles.widget}>
        <div style={styles.error}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="workflo-widget" style={styles.widget}>
      {/* Widget Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            ...styles.fabButton,
            backgroundColor: config.primaryColor || '#4F46E5',
          }}
          aria-label="Open Workflo Widget"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      )}

      {/* Widget Panel (when open) */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <span style={styles.headerIcon}>🔄</span>
              <span>Workflo</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
              aria-label="Close Widget"
            >
              ✕
            </button>
          </div>

          {/* Organization Info */}
          <div style={styles.orgInfo}>
            {widgetConfig?.name}
          </div>

          {/* New Task Input */}
          <div style={styles.newTaskSection}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="Add a new task..."
              style={styles.input}
            />
            <button
              onClick={handleCreateTask}
              style={{
                ...styles.addButton,
                backgroundColor: config.primaryColor || '#4F46E5',
              }}
            >
              +
            </button>
          </div>

          {/* Tasks List */}
          <div style={styles.tasksList}>
            {tasks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📋</div>
                <div style={styles.emptyText}>No tasks yet</div>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} style={styles.taskItem}>
                  <div style={styles.taskTitle}>{task.title}</div>
                  {task.description && (
                    <div style={styles.taskDescription}>{task.description}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerText}>Powered by Workflo</span>
            {widgetConfig?.features?.realtime && (
              <span style={styles.realtimeBadge}>● Live</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  widget: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  fabButton: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s',
  },
  panel: {
    width: '360px',
    maxHeight: '600px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '16px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    lineHeight: '1',
  },
  orgInfo: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
  },
  newTaskSection: {
    padding: '16px',
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  addButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
  },
  taskItem: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  taskTitle: {
    fontWeight: '500',
    marginBottom: '4px',
  },
  taskDescription: {
    fontSize: '12px',
    color: '#6b7280',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
  },
  footerText: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  realtimeBadge: {
    fontSize: '11px',
    color: '#10b981',
    fontWeight: '500',
  },
  loading: {
    padding: '32px',
    textAlign: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#4F46E5',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '32px',
    textAlign: 'center',
    color: '#ef4444',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '14px',
  },
};

// Attach to window for loader script
window.WorkfloWidgetApp = {
  init(container, config = {}) {
    try {
      // Add spinner animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      // Render the widget
      const root = createRoot(container);
      root.render(<WidgetApp config={config} />);

      return {
        destroy: () => root.unmount(),
      };
    } catch (err) {
      console.error('Widget mount failed:', err);
      return null;
    }
  },
};

// Export for bundling
export default WidgetApp;
