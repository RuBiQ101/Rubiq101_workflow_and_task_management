import React, { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import TaskModal from './TaskModal';

/**
 * Props:
 *  - workspaceId (string)
 *  - onSelectProject(optional) -> opens a project
 *
 * This component will:
 *  - list projects in workspace
 *  - fetch tasks per project (lightweight)
 *  - render columns (TODO, IN_PROGRESS, DONE)
 *  - allow opening TaskModal on click
 */

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

export default function ProjectBoard({ workspaceId }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get(`/workspaces/${workspaceId}/projects`).then((res) => {
      setProjects(res.items || res); // depending on backend list shape
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load projects', err);
      setLoading(false);
    });
  }, [workspaceId]);

  useEffect(() => {
    // load tasks for first project automatically
    if (!projects?.length) {
      setTasksByStatus({});
      return;
    }
    const project = projects[0];
    setSelectedProject(project);
    fetchTasks(project.id);
  }, [projects]);

  async function fetchTasks(projectId) {
    try {
      const res = await api.get(`/projects/${projectId}/tasks?limit=200`);
      // backend may return {items, total}
      const items = Array.isArray(res) ? res : res.items ?? [];
      const map = STATUSES.reduce((acc, s) => ({ ...acc, [s]: [] }), {});
      items.forEach(t => (map[t.status || 'TODO'] ||= []).push(t));
      setTasksByStatus(map);
    } catch (err) {
      console.error('failed fetching tasks', err);
    }
  }

  function openProject(p) {
    setSelectedProject(p);
    fetchTasks(p.id);
  }

  async function onTaskUpdated(updated) {
    // optimistic update: replace task in tasksByStatus
    setTasksByStatus(prev => {
      const copy = { ...prev };
      // remove from old status buckets
      for (const s of Object.keys(copy)) {
        copy[s] = copy[s].filter(t => t.id !== updated.id);
      }
      copy[updated.status] = [updated, ...(copy[updated.status] || [])];
      return copy;
    });
  }

  if (!workspaceId) return <div className="p-4 text-sm text-gray-500">Select a workspace</div>;
  if (loading) return <div className="p-6">Loading projects…</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Projects</h2>
        <div>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => openProject(p)}
              className={`px-3 py-1 mr-2 rounded ${selectedProject?.id === p.id ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedProject ? (
        <div className="p-4 text-gray-600">No project selected</div>
      ) : (
        <div>
          <h3 className="text-lg font-medium mb-3">{selectedProject.name}</h3>

          <div className="grid grid-cols-3 gap-4">
            {STATUSES.map(status => (
              <div key={status} className="bg-white rounded p-3 shadow-sm">
                <div className="font-semibold mb-2">{status.replace(/_/g,' ')}</div>
                <div className="space-y-2 min-h-[120px]">
                  {(tasksByStatus[status] || []).map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-gray-50 rounded border cursor-pointer hover:shadow"
                      onClick={() => setActiveTask(task)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-gray-500">{task.priority ? `P${task.priority}` : ''}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.subtasks?.length ? `${task.subtasks.length} subtasks` : ''}</div>
                    </div>
                  ))}

                  {/* Add quick create in column */}
                  <AddTaskInline projectId={selectedProject.id} status={status} onCreated={t => onTaskUpdated(t)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTask && (
        <TaskModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onSaved={(t) => {
            setActiveTask(t);
            onTaskUpdated(t);
          }}
        />
      )}
    </div>
  );
}

function AddTaskInline({ projectId, status, onCreated }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');

  async function create() {
    if (!title.trim()) return;
    try {
      const newTask = await api.post(`/projects/${projectId}/tasks`, {
        title,
        status,
      });
      setTitle('');
      setOpen(false);
      onCreated(newTask);
    } catch (e) {
      console.error('create failed', e);
      alert('Failed to create');
    }
  }

  if (!open) return <button className="text-sm text-indigo-600 mt-2" onClick={() => setOpen(true)}>+ Add</button>;

  return (
    <div className="mt-2">
      <input value={title} onChange={e => setTitle(e.target.value)}
        className="w-full p-2 border rounded text-sm" placeholder="Task title" />
      <div className="mt-2 flex gap-2">
        <button onClick={create} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Create</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1 rounded border text-sm">Cancel</button>
      </div>
    </div>
  );
}
