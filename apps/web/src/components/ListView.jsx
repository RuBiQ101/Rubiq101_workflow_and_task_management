import React, { useState } from 'react';

export default function ListView({ workflow, tasks, onTaskUpdate, onTaskCreate }) {
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate, priority, status, title
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filter tasks
  let filteredTasks = tasks;
  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }
  if (filterPriority !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
      case 'priority': {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
      }
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Controls */}
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              {workflow.columns?.map(col => (
                <option key={col.key} value={col.key}>{col.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Priority:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          + Add Task
        </button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-700 border-b">
        <div className="col-span-4">Task</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-2">Due Date</div>
        <div className="col-span-2">Assignee</div>
      </div>

      {/* Task List */}
      <div className="divide-y">
        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tasks found
          </div>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="col-span-4">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="col-span-2 flex items-center">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {workflow.columns?.find(c => c.key === task.status)?.label || task.status}
                </span>
              </div>
              <div className="col-span-2 flex items-center">
                <span className={`px-2 py-1 rounded text-sm ${priorityColors[task.priority] || priorityColors.medium}`}>
                  {task.priority || 'medium'}
                </span>
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-700">
                {task.dueDate ? (
                  <span className={new Date(task.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-gray-400">No due date</span>
                )}
              </div>
              <div className="col-span-2 flex items-center">
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                      {task.assignee.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unassigned</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <NewTaskModal
          workflow={workflow}
          onClose={() => setShowNewTaskModal(false)}
          onCreate={(taskData) => {
            onTaskCreate(taskData);
            setShowNewTaskModal(false);
          }}
        />
      )}

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

// New Task Modal Component
function NewTaskModal({ workflow, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState(workflow.columns?.[0]?.key || '');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      title,
      description,
      priority,
      status,
      dueDate: dueDate || null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
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

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
function TaskDetailModal({ task, workflow, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onUpdate(task.id, editedTask);
    setIsEditing(false);
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
                  Description
                </label>
                <textarea
                  value={editedTask.description}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex gap-3">
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
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded">
                    {task.priority || 'medium'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
