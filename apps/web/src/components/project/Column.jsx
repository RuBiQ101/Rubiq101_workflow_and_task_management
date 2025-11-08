import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { TaskCard } from './TaskCard';

export default function Column({ title, tasks = [] }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 h-full flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
          {tasks.length}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3 flex-1">
        {tasks.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            No tasks
          </div>
        )}

        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`transition-transform ${
                  snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl' : ''
                }`}
              >
                <TaskCard task={task} isDragging={snapshot.isDragging} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}
