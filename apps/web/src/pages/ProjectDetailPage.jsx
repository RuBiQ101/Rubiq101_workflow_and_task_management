import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Filter, MoreVertical, LayoutGrid, List } from 'lucide-react';
import api from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TaskCard } from '../components/project/TaskCard';
import CommentsThread from '../components/CommentsThread';
import TaskModal from '../components/TaskModal';
import KanbanBoard from '../components/project/KanbanBoard';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`)
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-gray-900"
                >
                  {project.name}
                </motion.h1>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <Button onClick={handleCreateTask}>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatBadge label="Total" value={taskStats.total} color="gray" />
          <StatBadge label="To Do" value={taskStats.todo} color="blue" />
          <StatBadge label="In Progress" value={taskStats.inProgress} color="yellow" />
          <StatBadge label="Done" value={taskStats.done} color="green" />
        </motion.div>

        {/* Kanban Board View */}
        {viewMode === 'kanban' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <KanbanBoard
              projectId={id}
              workspaceId={project.workspaceId}
              initialColumns={['todo', 'in_progress', 'done']}
              columnLabels={{
                todo: 'To Do',
                in_progress: 'In Progress',
                done: 'Done'
              }}
            />
          </motion.div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {['all', 'todo', 'in-progress', 'done'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All Tasks' : status.replace('-', ' ')}
                  <span className="ml-2 text-xs opacity-75">
                    ({status === 'all' ? taskStats.total : taskStats[status.replace('-', '')]} )
                  </span>
                </button>
              ))}
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {filteredTasks.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 mb-4">
                        {filterStatus === 'all' 
                          ? 'No tasks yet. Create your first task!'
                          : `No ${filterStatus.replace('-', ' ')} tasks`
                        }
                      </p>
                      <Button onClick={handleCreateTask} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Project Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentsThread resourceType="project" resourceId={id} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projectId={id}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
            loadProjectData();
          }}
        />
      )}
    </div>
  );
}

// Stat Badge Component
function StatBadge({ label, value, color }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    green: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
