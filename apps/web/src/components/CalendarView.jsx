import React, { useState } from 'react';

export default function CalendarView({ workflow, tasks, onTaskUpdate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      if (date.getMonth() === month && date.getFullYear() === year) {
        const day = date.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(task);
      }
    }
    return acc;
  }, {});

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
        {dayNames.map(day => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`bg-white min-h-[120px] p-2 ${
              day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
            } ${isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
          >
            {day && (
              <>
                <div className={`text-sm font-semibold mb-2 ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {tasksByDate[day]?.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`text-xs p-1 rounded truncate cursor-pointer hover:shadow-sm transition-shadow ${
                        getPriorityColor(task.priority)
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {tasksByDate[day]?.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{tasksByDate[day].length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-200"></div>
          <span>Urgent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-200"></div>
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-200"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200"></div>
          <span>Low</span>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workflow={workflow}
          onClose={() => setSelectedTask(null)}
          onUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-200 text-red-800 hover:bg-red-300';
    case 'high':
      return 'bg-orange-200 text-orange-800 hover:bg-orange-300';
    case 'medium':
      return 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300';
    case 'low':
      return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
    default:
      return 'bg-blue-200 text-blue-800 hover:bg-blue-300';
  }
}

// Task Detail Modal Component
function TaskDetailModal({ task, workflow, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onUpdate(task.id, editedTask);
    setIsEditing(false);
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  };

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

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editedTask.description}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editedTask.status}
                    onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {workflow.columns?.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={editedTask.priority}
                    onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{task.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded">
                    {workflow.columns?.find(c => c.key === task.status)?.label || task.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Priority</h3>
                  <span className={`inline-block px-3 py-1 rounded ${priorityColors[task.priority] || priorityColors.medium}`}>
                    {task.priority || 'medium'}
                  </span>
                </div>
              </div>

              {task.dueDate && (
                <div>
                  <h3 className="font-semibold mb-2">Due Date</h3>
                  <p className="text-gray-700">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
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
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
