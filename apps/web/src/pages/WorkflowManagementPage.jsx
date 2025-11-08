import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/KanbanBoard';
import ListView from '../components/ListView';
import CalendarView from '../components/CalendarView';
import api from '../api/client';

export default function WorkflowManagementPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar
  const [workspace, setWorkspace] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

  const loadWorkflowTasks = async () => {
    if (!selectedWorkflow) return;
    try {
      const { data } = await api.get(`/workflows/${selectedWorkflow.id}/tasks`);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const { data: workspaceData } = await api.get(`/workspaces/${workspaceId}`);
      setWorkspace(workspaceData);

      const { data: workflowsData } = await api.get(`/workspaces/${workspaceId}/workflows`);
      setWorkflows(workflowsData);
      
      if (workflowsData.length > 0) {
        setSelectedWorkflow(workflowsData[0]);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    loadWorkflowTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflow]);

  const handleCreateWorkflow = async (workflowData) => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/workflows`, workflowData);
      setWorkflows([...workflows, data]);
      setShowNewWorkflowModal(false);
      setSelectedWorkflow(data);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      const { data } = await api.patch(`/tasks/${taskId}`, updates);
      setTasks(tasks.map(t => t.id === taskId ? data : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskCreate = async (taskData) => {
    try {
      const { data } = await api.post(`/workflows/${selectedWorkflow.id}/tasks`, taskData);
      setTasks([...tasks, data]);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {workspace?.name || 'Workspace'}
                </h1>
                <p className="text-sm text-gray-600">
                  {selectedWorkflow?.name || 'Select a workflow'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Kanban
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📝 List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📅 Calendar
                </button>
              </div>

              <button
                onClick={() => setShowNewWorkflowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Workflow
              </button>
            </div>
          </div>

          {/* Workflow Tabs */}
          {workflows.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {workflows.map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedWorkflow?.id === workflow.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {workflow.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {!selectedWorkflow ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No workflows yet</p>
            <button
              onClick={() => setShowNewWorkflowModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first workflow →
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' && (
              <KanbanBoard
                workflow={selectedWorkflow}
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskCreate={handleTaskCreate}
              />
            )}
            {viewMode === 'list' && (
              <ListView
                workflow={selectedWorkflow}
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskCreate={handleTaskCreate}
              />
            )}
            {viewMode === 'calendar' && (
              <CalendarView
                workflow={selectedWorkflow}
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
              />
            )}
          </>
        )}
      </div>

      {/* New Workflow Modal */}
      {showNewWorkflowModal && (
        <NewWorkflowModal
          onClose={() => setShowNewWorkflowModal(false)}
          onCreate={handleCreateWorkflow}
        />
      )}
    </div>
  );
}

// New Workflow Modal Component
function NewWorkflowModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('blank');

  const templates = [
    { id: 'blank', name: 'Blank Workflow', columns: ['To Do', 'In Progress', 'Done'] },
    { id: 'agile', name: 'Agile Sprint', columns: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'] },
    { id: 'design', name: 'Design Process', columns: ['Ideas', 'Wireframe', 'Design', 'Review', 'Approved'] },
    { id: 'content', name: 'Content Creation', columns: ['Ideas', 'Draft', 'Edit', 'Review', 'Published'] }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedTemplate = templates.find(t => t.id === template);
    onCreate({
      name,
      description,
      columns: selectedTemplate.columns.map((col, index) => ({
        key: col.toLowerCase().replace(/\s+/g, '_'),
        label: col,
        order: index
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Create New Workflow</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My Workflow"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Describe your workflow..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <div className="space-y-2">
                {templates.map(t => (
                  <label
                    key={t.id}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={template === t.id}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {t.columns.join(' → ')}
                      </div>
                    </div>
                  </label>
                ))}
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
                Create Workflow
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
