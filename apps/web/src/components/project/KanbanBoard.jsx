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
      console.log('Loading board data for project:', projectId);
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
      console.error('Failed to load board', err);
      setError('Failed to load kanban board');
      
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
      await api.post(`/projects/${projectId}/tasks/move`, {
        taskId: draggableId,
        toColumn: toCol,
        toIndex: toIndex,
      });
      console.log('Task moved successfully on server');
      // Server will emit realtime to other clients
    } catch (err) {
      console.error('Move failed, reverting:', err);
      // Revert (reload full board for simplicity)
      await loadBoard();
      setError('Failed to move task. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  if (error && loading === false) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
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
