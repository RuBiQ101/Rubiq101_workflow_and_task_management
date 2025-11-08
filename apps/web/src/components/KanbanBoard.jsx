import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function KanbanBoard({ workflow, tasks, onTaskUpdate, onTaskCreate }) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const columns = workflow.columns || [];
  
  // Group tasks by column
  const tasksByColumn = columns.reduce((acc, column) => {
    acc[column.key] = tasks.filter(task => task.status === column.key);
    return acc;
  }, {});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    const overColumn = columns.find(c => over.id.startsWith(`column-${c.key}`)) 
      ? over.id.replace('column-', '') 
      : over.id;
    
    if (activeTask && overColumn) {
      onTaskUpdate(activeTask.id, { status: overColumn });
    }
    
    setActiveId(null);
  };

  const handleAddTask = (columnKey) => {
    setSelectedColumn(columnKey);
    setShowNewTaskModal(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {columns.map(column => (
            <div key={column.key} className="flex-shrink-0 w-80">
              <div className="bg-gray-100 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {column.label}
                    <span className="ml-2 text-sm text-gray-500">
                      ({tasksByColumn[column.key]?.length || 0})
                    </span>
                  </h3>
                  <button
                    onClick={() => handleAddTask(column.key)}
                    className="text-gray-600 hover:text-gray-900 text-xl"
                  >
                    +
                  </button>
                </div>

                <SortableContext
                  id={`column-${column.key}`}
                  items={tasksByColumn[column.key]?.map(t => t.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 space-y-3 min-h-[200px]">
                    {tasksByColumn[column.key]?.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white rounded-lg p-4 shadow-lg opacity-90">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <NewTaskModal
          columnKey={selectedColumn}
          columnLabel={columns.find(c => c.key === selectedColumn)?.label}
          onClose={() => setShowNewTaskModal(false)}
          onCreate={(taskData) => {
            onTaskCreate({ ...taskData, status: selectedColumn });
            setShowNewTaskModal(false);
          }}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}

// Sortable Task Card wrapper
function SortableTaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <TaskCard task={task} />
    </div>
  );
}

// Task Card Component
function TaskCard({ task }) {
  const priorityColors = {
    low: 'bg-gray-200 text-gray-700',
    medium: 'bg-yellow-200 text-yellow-800',
    high: 'bg-orange-200 text-orange-800',
    urgent: 'bg-red-200 text-red-800'
  };

  return (
    <>
      <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.priority && (
            <span className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority] || priorityColors.medium}`}>
              {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs text-gray-500">
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
            {task.assignee.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.tags.map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

// New Task Modal Component
function NewTaskModal({ columnKey, columnLabel, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      title,
      description,
      priority,
      dueDate: dueDate || null,
      status: columnKey
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            New Task in {columnLabel}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder="Task description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold">{task.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{task.description || 'No description'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded">
                  {task.status}
                </span>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Priority</h3>
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded">
                  {task.priority || 'medium'}
                </span>
              </div>
            </div>

            {task.dueDate && (
              <div>
                <h3 className="font-semibold mb-2">Due Date</h3>
                <p className="text-gray-700">
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {task.assignee && (
              <div>
                <h3 className="font-semibold mb-2">Assigned To</h3>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    {task.assignee.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span>{task.assignee.name || 'Unassigned'}</span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  // Add edit functionality here
                  console.log('Edit task:', task.id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
