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
    loadBoard();
  }, [projectId]);

  async function loadBoard() {
    setLoading(true);
    setError('');
    try {
      // API: GET /workspaces/:workspaceId/projects/:projectId/board
      const { data } = await api.get(`/workspaces/${workspaceId}/projects/${projectId}/board`);
      setColumns(data.columns || {});
    } catch (err) {
      console.error('Failed to load board', err);
      setError('Failed to load kanban board');
    } finally {
      setLoading(false);
    }
  }

  // Handle drag end
  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return; // dropped outside

    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    const fromIndex = source.index;
    const toIndex = destination.index;

    // Quick no-op: same position
    if (fromCol === toCol && fromIndex === toIndex) return;

    // Optimistic update
    const newColumns = JSON.parse(JSON.stringify(columns));
    const [moved] = newColumns[fromCol].splice(fromIndex, 1);
    newColumns[toCol].splice(toIndex, 0, moved);
    setColumns(newColumns);

    // Send move to server
    try {
      await api.post(`/projects/${projectId}/tasks/move`, {
        taskId: draggableId,
        toColumn: toCol,
        toIndex: toIndex,
      });
      // Server will emit realtime to other clients
    } catch (err) {
      console.error('Move failed, reverting', err);
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
