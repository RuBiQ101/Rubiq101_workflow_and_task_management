import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, Users, TrendingUp, Activity, Plus, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeWorkflows: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load user's workspaces
      const { data: workspacesData } = await api.get('/workspaces');
      setWorkspaces(workspacesData);

      // Load dashboard statistics
      const { data: statsData } = await api.get('/dashboard/stats');
      setStats(statsData);

      // Load recent activity
      const { data: activityData } = await api.get('/activities/recent');
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent"
            >
              Dashboard
            </motion.h1>
            <Button
              onClick={() => navigate('/workspace/new')}
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={Folder}
            color="blue"
          />
          <StatCard
            title="Active Tasks"
            value={stats.totalTasks - stats.completedTasks}
            icon={Activity}
            color="green"
          />
          <StatCard
            title="Completed Tasks"
            value={stats.completedTasks}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Active Workflows"
            value={stats.activeWorkflows}
            icon={Users}
            color="orange"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspaces List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-indigo-600" />
                  Your Workspaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workspaces.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="mb-4">No workspaces yet</p>
                    <Button
                      onClick={() => navigate('/workspace/new')}
                      variant="outline"
                    >
                      Create your first workspace →
                    </Button>
                  </div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05
                        }
                      }
                    }}
                    className="space-y-4"
                  >
                    {workspaces.map(workspace => (
                      <WorkspaceCard
                        key={workspace.id}
                        workspace={workspace}
                        onClick={() => navigate(`/workspace/${workspace.id}`)}
                      />
                    ))}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 10).map(activity => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                  icon={Plus}
                  label="New Project"
                  onClick={() => navigate('/project/new')}
                />
                <QuickActionButton
                  icon={Activity}
                  label="New Task"
                  onClick={() => navigate('/task/new')}
                />
                <QuickActionButton
                  icon={TrendingUp}
                  label="New Workflow"
                  onClick={() => navigate('/workflow/new')}
                />
                <QuickActionButton
                  icon={Folder}
                  label="View Reports"
                  onClick={() => navigate('/reports')}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Workspace Card Component
function WorkspaceCard({ workspace, onClick }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
      whileHover={{ scale: 1.01, x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <div
        onClick={onClick}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer bg-white"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-lg text-gray-900">
                {workspace.name}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {workspace.projects?.length || 0} projects
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {workspace.members?.length || 0} members
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        {workspace.projects && workspace.projects.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {workspace.projects.slice(0, 3).map(project => (
              <span
                key={project.id}
                className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100"
              >
                {project.name}
              </span>
            ))}
            {workspace.projects.length > 3 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{workspace.projects.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Activity Item Component
function ActivityItem({ activity }) {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        {activity.user?.name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-900">
          <span className="font-medium">{activity.user?.name || 'Someone'}</span>
          {' '}
          <span className="text-gray-600">{activity.action}</span>
        </p>
        <p className="text-gray-500 text-xs">{timeAgo(activity.createdAt)}</p>
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickActionButton({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
    >
      <Icon className="w-8 h-8 mb-2 text-indigo-600" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </motion.button>
  );
}
