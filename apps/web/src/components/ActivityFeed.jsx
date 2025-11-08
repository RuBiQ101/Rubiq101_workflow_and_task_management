import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ActivityFeed({ organizationId }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load(page);
  }, [organizationId, page]);

  async function load(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/activities/organization/${organizationId}?page=${p}&limit=50`,
      );
      if (res.data.items) {
        setItems(res.data.items);
        setTotal(res.data.total || 0);
      } else {
        setItems(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-4">Activity Feed</h4>

      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : null}

      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="text-sm border-b border-gray-100 pb-3">
            <div className="text-gray-700">{formatActivity(a)}</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(a.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && !loading && (
        <div className="text-sm text-gray-500 text-center py-4">
          No activity yet
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="text-xs text-gray-500">
          Page {page} {total ? `of ${Math.ceil(total / 50)}` : ''}
        </div>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={items.length < 50}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function formatActivity(a) {
  // Small formatter for common types
  try {
    const p = a.payload || {};
    switch (a.type) {
      case 'comment.created':
        return `💬 ${p.authorName || 'Someone'} commented: "${truncate(p.content, 80)}"`;
      case 'comment.updated':
        return `✏️ ${p.authorName || 'Someone'} edited a comment`;
      case 'comment.deleted':
        return `🗑️ ${p.authorName || 'Someone'} deleted a comment`;
      case 'task.updated':
        return `📝 ${p.actorName || 'Someone'} updated a task`;
      case 'task.created':
        return `✨ ${p.actorName || 'Someone'} created a task`;
      case 'member.invited':
        return `📧 ${p.actorName || 'Someone'} invited ${p.email} to the organization`;
      case 'member.joined':
        return `👋 ${p.actorName || 'Someone'} joined the organization`;
      case 'role.changed':
        return `🔑 ${p.actorName || 'Someone'} changed ${p.targetEmail || 'a user'}'s role to ${p.newRole}`;
      case 'member.removed':
        return `👤 ${p.actorName || 'Someone'} removed ${p.targetEmail || 'a user'} from the organization`;
      case 'attachment.added':
        return `📎 ${p.actorName || 'Someone'} added an attachment: ${p.filename || 'file'}`;
      default:
        return `${a.type} — ${JSON.stringify(p).slice(0, 120)}`;
    }
  } catch (err) {
    return a.type;
  }
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n - 1) + '…' : s;
}
