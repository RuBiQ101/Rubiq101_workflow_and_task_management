/**
 * EXAMPLE: Real-time Integration for TaskModal.jsx
 * 
 * This file shows how to integrate real-time WebSocket updates into the TaskModal component.
 * Add this code to your existing TaskModal.jsx component.
 */

import { useEffect, useCallback } from 'react';
import { useRealtime } from '../hooks/useRealtime';

// Inside your TaskModal component function:

export function TaskModal({ task, onClose, onSaved }) {
  const [localTask, setLocalTask] = useState(task);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const token = localStorage.getItem('token');

  // Load task details and comments
  useEffect(() => {
    if (task?.id) {
      fetchTaskDetails(task.id);
      fetchComments(task.id);
    }
  }, [task?.id]);

  const fetchTaskDetails = async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setLocalTask(data);
    }
  };

  const fetchComments = async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setComments(data);
    }
  };

  // Real-time handler: task updated by another user
  const handleTaskUpdated = useCallback((updatedTask) => {
    if (updatedTask.id === task?.id) {
      console.log('[Realtime] Task updated remotely:', updatedTask);
      
      // Check if local changes exist
      if (hasUnsavedChanges) {
        // Show conflict warning
        alert('This task was updated by another user. Your changes may conflict.');
      } else {
        // Update local state with remote changes
        setLocalTask(updatedTask);
        onSaved?.(updatedTask); // Notify parent component
      }
    }
  }, [task?.id, hasUnsavedChanges, onSaved]);

  // Real-time handler: new comment added
  const handleCommentCreated = useCallback((comment) => {
    if (comment.taskId === task?.id) {
      console.log('[Realtime] New comment:', comment);
      
      // Add comment to list if not already present
      setComments(prev => {
        const exists = prev.some(c => c.id === comment.id);
        if (exists) return prev;
        return [...prev, comment];
      });
    }
  }, [task?.id]);

  // Set up real-time subscription for this specific task
  useRealtime(
    token,
    {
      taskId: task?.id,
    },
    {
      'task.updated': handleTaskUpdated,
      'comment.created': handleCommentCreated,
    }
  );

  // Create comment with optimistic update
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      taskId: task.id,
      authorId: 'current-user-id', // Get from auth context
      author: {
        username: 'You', // Get from auth context
      },
      createdAt: new Date().toISOString(),
    };

    // Add optimistically
    setComments(prev => [...prev, optimisticComment]);
    setNewComment('');

    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const realComment = await response.json();

      // Replace optimistic comment with real one
      setComments(prev =>
        prev.map(c => (c.id === optimisticComment.id ? realComment : c))
      );
    } catch (error) {
      console.error('Failed to create comment:', error);
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      
      alert('Failed to add comment');
      setNewComment(newComment); // Restore input
    }
  };

  // Update task with optimistic UI
  const handleUpdateTask = async (updates) => {
    const previousTask = { ...localTask };

    // Update UI immediately
    setLocalTask(prev => ({ ...prev, ...updates }));

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setLocalTask(updatedTask);
      onSaved?.(updatedTask);
    } catch (error) {
      console.error('Failed to update task:', error);
      
      // Revert on error
      setLocalTask(previousTask);
      
      alert('Failed to update task');
    }
  };

  // Rest of your component code...
  return (
    <div className="task-modal">
      {/* Task details UI */}
      <div className="task-details">
        <input
          value={localTask.title}
          onChange={(e) => handleUpdateTask({ title: e.target.value })}
        />
        {/* Other fields... */}
      </div>

      {/* Comments section */}
      <div className="comments-section">
        <h3>Comments</h3>
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <strong>{comment.author.username}</strong>
            <p>{comment.content}</p>
            <small>{new Date(comment.createdAt).toLocaleString()}</small>
          </div>
        ))}
        
        <div className="new-comment">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button onClick={handleAddComment}>Post Comment</button>
        </div>
      </div>
    </div>
  );
}
