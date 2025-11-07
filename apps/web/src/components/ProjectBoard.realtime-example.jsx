/**
 * EXAMPLE: Real-time Integration for ProjectBoard.jsx
 * 
 * This file shows how to integrate real-time WebSocket updates into the ProjectBoard component.
 * Add this code to your existing ProjectBoard.jsx component.
 */

import { useEffect, useCallback } from 'react';
import { useRealtime } from '../hooks/useRealtime';

// Inside your ProjectBoard component function:

export function ProjectBoard() {
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  const token = localStorage.getItem('token');

  // Handler for task updates via WebSocket
  const handleTaskUpdated = useCallback((updatedTask) => {
    console.log('[Realtime] Task updated:', updatedTask);
    
    setTasksByStatus(prev => {
      const copy = { ...prev };
      
      // Remove task from all status columns
      for (const status in copy) {
        copy[status] = (copy[status] || []).filter(t => t.id !== updatedTask.id);
      }
      
      // Add to the correct status column
      if (!copy[updatedTask.status]) {
        copy[updatedTask.status] = [];
      }
      copy[updatedTask.status] = [updatedTask, ...copy[updatedTask.status]];
      
      return copy;
    });
  }, []);

  // Handler for newly created tasks
  const handleTaskCreated = useCallback((newTask) => {
    console.log('[Realtime] Task created:', newTask);
    
    // Only add if it belongs to the current project
    if (newTask.projectId === selectedProject?.id) {
      setTasksByStatus(prev => {
        const copy = { ...prev };
        if (!copy[newTask.status]) {
          copy[newTask.status] = [];
        }
        copy[newTask.status] = [newTask, ...copy[newTask.status]];
        return copy;
      });
    }
  }, [selectedProject?.id]);

  // Handler for deleted tasks
  const handleTaskDeleted = useCallback((payload) => {
    console.log('[Realtime] Task deleted:', payload.taskId);
    
    setTasksByStatus(prev => {
      const copy = { ...prev };
      for (const status in copy) {
        copy[status] = (copy[status] || []).filter(t => t.id !== payload.taskId);
      }
      return copy;
    });
  }, []);

  // Handler for new comments
  const handleCommentCreated = useCallback((comment) => {
    console.log('[Realtime] Comment created:', comment);
    
    // Add comment to the task in state
    setTasksByStatus(prev => {
      const copy = { ...prev };
      for (const status in copy) {
        copy[status] = (copy[status] || []).map(task => {
          if (task.id === comment.taskId) {
            return {
              ...task,
              comments: [...(task.comments || []), comment]
            };
          }
          return task;
        });
      }
      return copy;
    });
  }, []);

  // Handler for notifications
  const handleNotification = useCallback((notification) => {
    console.log('[Realtime] Notification:', notification);
    
    // Show notification to user (you can use a toast library)
    if (notification.message) {
      alert(notification.message); // Replace with proper notification UI
    }
  }, []);

  // Set up real-time connection and subscriptions
  useRealtime(
    token,
    {
      workspaceId: workspaceId,
      projectId: selectedProject?.id,
    },
    {
      'task.updated': handleTaskUpdated,
      'task.created': handleTaskCreated,
      'task.deleted': handleTaskDeleted,
      'comment.created': handleCommentCreated,
      'notification': handleNotification,
    }
  );

  // Optimistic update example: when creating a task locally
  const createTaskOptimistic = async (taskData) => {
    // Generate temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to UI immediately
    setTasksByStatus(prev => {
      const copy = { ...prev };
      if (!copy[taskData.status]) {
        copy[taskData.status] = [];
      }
      copy[taskData.status] = [optimisticTask, ...copy[taskData.status]];
      return copy;
    });

    try {
      // Make API call
      const response = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const realTask = await response.json();

      // Replace optimistic task with real one
      setTasksByStatus(prev => {
        const copy = { ...prev };
        if (copy[realTask.status]) {
          copy[realTask.status] = copy[realTask.status].map(t =>
            t.id === tempId ? realTask : t
          );
        }
        return copy;
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Remove optimistic task on error
      setTasksByStatus(prev => {
        const copy = { ...prev };
        if (copy[taskData.status]) {
          copy[taskData.status] = copy[taskData.status].filter(t => t.id !== tempId);
        }
        return copy;
      });
      
      alert('Failed to create task');
    }
  };

  // Rest of your component code...
  return (
    <div className="project-board">
      {/* Your existing board UI */}
    </div>
  );
}
