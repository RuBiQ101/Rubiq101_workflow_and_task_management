import React, { useEffect, useState } from 'react';
import { api } from '../api/apiClient';

export default function TaskModal({ task: initialTask, onClose, onSaved }) {
  const [task, setTask] = useState(initialTask);
  const [saving, setSaving] = useState(false);
  const [newSub, setNewSub] = useState('');

  useEffect(() => setTask(initialTask), [initialTask]);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.put(`/projects/${task.projectId}/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
      });
      setTask(updated);
      onSaved && onSaved(updated);
    } catch (e) {
      console.error(e);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask() {
    if (!newSub.trim()) return;
    try {
      const created = await api.post(`/projects/${task.projectId}/tasks/${task.id}/subtasks`, { title: newSub });
      setTask(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), created] }));
      setNewSub('');
    } catch (e) {
      console.error(e);
      alert('Failed to add subtask');
    }
  }

  async function toggleSub(subtask) {
    try {
      const updated = await api.put(`/projects/${task.projectId}/tasks/subtasks/${subtask.id}`, { isDone: !subtask.isDone });
      setTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(s => s.id === updated.id ? updated : s),
      }));
    } catch (e) {
      console.error(e);
      alert('Failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg w-[90%] max-w-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">Task</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Title</label>
            <input value={task.title} onChange={e => setTask({...task, title: e.target.value})}
              className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Description</label>
            <textarea rows="4" value={task.description || ''} onChange={e => setTask({...task, description: e.target.value})}
              className="w-full p-2 border rounded" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600 block">Status</label>
              <select value={task.status} onChange={e => setTask({...task, status: e.target.value})} className="w-full p-2 border rounded">
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block">Priority</label>
              <input type="number" min="1" max="5" value={task.priority || ''} onChange={e => setTask({...task, priority: Number(e.target.value)})}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block">Due date</label>
              <input type="date" value={task.dueDate ? task.dueDate.slice(0,10) : ''} onChange={e => setTask({...task, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null})}
                className="w-full p-2 border rounded" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Subtasks</div>
            </div>

            <div className="space-y-2">
              {(task.subtasks || []).map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <input type="checkbox" checked={s.isDone} onChange={() => toggleSub(s)} />
                  <div className={`flex-1 ${s.isDone ? 'line-through text-gray-400' : ''}`}>{s.title}</div>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="New subtask"
                  className="flex-1 p-2 border rounded" />
                <button onClick={addSubtask} className="px-3 py-1 bg-indigo-600 text-white rounded">Add</button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
            <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
