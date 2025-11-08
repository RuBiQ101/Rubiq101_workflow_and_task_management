import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import Column from './Column';
import api from '../../api/client';

export default function KanbanBoard({
  projectId,
  workspaceId,
  initialColumns = ['todo', 'in_progress', 'done'],
  columnLabels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' },
}) {
  const [columns, setColumns] = useState({}); // { columnKey: [task,...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('KanbanBoard mounted with:', { projectId, workspaceId });
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadBoard() {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Loading board data for project:', projectId);
      console.log('API request:', `GET /workspaces/${workspaceId}/projects/${projectId}/board`);
      
      // Use consistent project-based endpoint
      const { data } = await api.get(`/workspaces/${workspaceId}/projects/${projectId}/board`);
      console.log('Board API response:', data);
      
      // Ensure all columns exist with empty arrays if not present
      const safeColumns = {
        todo: data.columns?.todo || [],
        in_progress: data.columns?.in_progress || [],
        done: data.columns?.done || []
      };
      
      console.log('Processed columns:', safeColumns);
      setColumns(safeColumns);
    } catch (err) {
      console.error('Failed to load board:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Redirect to login after delay
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.message === 'No authentication token found') {
        setError('Please login to continue.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Failed to load kanban board');
      }
      
      // Initialize empty columns on error to prevent undefined errors
      setColumns({
        todo: [],
        in_progress: [],
        done: []
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle drag end
  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    
    console.log('Drag ended:', { destination, source, draggableId });
    
    if (!destination) {
      console.log('Dropped outside droppable area');
      return; // dropped outside
    }

    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    const fromIndex = source.index;
    const toIndex = destination.index;

    // Quick no-op: same position
    if (fromCol === toCol && fromIndex === toIndex) {
      console.log('Dropped in same position, no action needed');
      return;
    }

    console.log(`Moving task ${draggableId} from ${fromCol}[${fromIndex}] to ${toCol}[${toIndex}]`);

    // Validate that source column exists and has tasks
    if (!columns[fromCol] || !columns[fromCol][fromIndex]) {
      console.error('Invalid source column or index:', { fromCol, fromIndex, columns });
      setError('Failed to move task: Invalid source');
      return;
    }

    // Optimistic update
    const newColumns = JSON.parse(JSON.stringify(columns));
    const [moved] = newColumns[fromCol].splice(fromIndex, 1);
    
    // Ensure destination column exists
    if (!newColumns[toCol]) {
      newColumns[toCol] = [];
    }
    
    newColumns[toCol].splice(toIndex, 0, moved);
    setColumns(newColumns);

    // Send move to server
    try {
      console.log('Sending move request to API...');
      console.log('Move request data:', {
        taskId: draggableId,
        toColumn: toCol,
        toIndex: toIndex
      });
      
      await api.post(`/projects/${projectId}/tasks/move`, {
        taskId: draggableId,
        toColumn: toCol,
        toIndex: toIndex,
      });
      
      console.log('Task moved successfully on server');
      // Server will emit realtime to other clients
    } catch (err) {
      console.error('Move failed, reverting:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 500) {
        setError('Server error moving task. Please try again.');
      } else {
        setError('Failed to move task. Please try again.');
      }
      
      // Revert (reload full board for simplicity)
      await loadBoard();
      setTimeout(() => setError(''), 5000);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-600 font-medium">Loading board...</div>
        <div className="text-gray-500 text-sm mt-2">Please wait while we fetch your tasks</div>
      </div>
    );
  }

  if (error && loading === false && !columns.todo) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md text-center">
          <div className="font-semibold mb-2">Error Loading Board</div>
          <div className="mb-4">{error}</div>
          <button
            onClick={loadBoard}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {initialColumns.map((colKey) => (
            <Droppable droppableId={colKey} key={colKey}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[200px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  <Column
                    title={columnLabels[colKey] || colKey}
                    tasks={columns[colKey] || []}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
