import React, { useEffect, useState, useRef } from 'react';
import api from '../api/client';

// props: projectId, taskId, currentUser
export default function CommentsThread({ projectId, taskId, currentUser }) {
  const [comments, setComments] = useState([]); // newest-first array
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null); // cursor for next page (older)
  const [hasMore, setHasMore] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // initial load
    loadPage();
    return () => {
      mountedRef.current = false;
    };
  }, [taskId]);

  async function loadPage() {
    setLoading(true);
    setError(null);
    try {
      const url = `/projects/${projectId}/tasks/${taskId}/comments/cursor?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await api.get(url);
      // res.data.items is newest-first (desc). We want to append older comments to the end.
      const items = res.data.items || [];
      const reactionsMap = res.data.reactionsMap || {};

      // Merge reactions into comments
      const itemsWithReactions = items.map((c) => ({
        ...c,
        _reactions: reactionsMap[c.id] || { counts: {}, my: {} },
      }));

      if (!cursor) {
        setComments(itemsWithReactions); // fresh load
      } else {
        setComments((prev) => [...prev, ...itemsWithReactions]); // append older items
      }
      setCursor(res.data.nextCursor || null);
      setHasMore(res.data.hasNext || false);
    } catch (err) {
      console.error('Failed to load comments', err);
      setError('Failed to load comments');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Post new comment (newest-first)
  async function postComment(parentId = null) {
    if (!newContent.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const saved = await api.post(
        `/projects/${projectId}/tasks/${taskId}/comments`,
        { content: newContent, parentId }
      );
      setNewContent('');
      // optimistic insert at start (newest-first)
      setComments((prev) => [
        { ...saved.data, _reactions: { counts: {}, my: {} } },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to post comment');
    } finally {
      setPosting(false);
    }
  }

  // Toggle reaction
  async function toggleReaction(commentId, type) {
    // optimistic UI: toggle count and my flag locally immediately
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const my = c._reactions?.my?.[type];
        const counts = { ...(c._reactions?.counts || {}) };
        counts[type] = Math.max(0, (counts[type] || 0) + (my ? -1 : 1));
        const mymap = { ...(c._reactions?.my || {}) };
        mymap[type] = !my;
        return { ...c, _reactions: { counts, my: mymap } };
      })
    );

    try {
      await api.post(`/comments/${commentId}/reactions`, { type });
      // server will emit events that update actual counts; we rely on optimistic change until then
    } catch (err) {
      console.error(err);
      setError('Failed to update reaction');
      // revert optimistic on error by reloading
      setCursor(null);
      setComments([]);
      setHasMore(true);
      loadPage();
    }
  }

  function renderReactions(comment) {
    const counts = comment._reactions?.counts || {};
    const my = comment._reactions?.my || {};
    const types = Object.keys(counts).length ? Object.keys(counts) : ['like']; // default if none
    // show common reaction types with counts
    const common = ['like', 'heart', 'laugh', 'thumbs_up'];
    const show = Array.from(new Set([...common, ...types])).slice(0, 6);

    return (
      <div className="flex gap-2 items-center">
        {show.map((t) => (
          <button
            key={t}
            onClick={() => toggleReaction(comment.id, t)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              my[t]
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            title={`${t}: ${counts[t] || 0}`}
          >
            {emojiFor(t)} {counts[t] || 0}
          </button>
        ))}
      </div>
    );
  }

  function emojiFor(type) {
    switch (type) {
      case 'like':
        return '👍';
      case 'thumbs_up':
        return '👍';
      case 'heart':
        return '❤️';
      case 'laugh':
        return '😄';
      default:
        return '•';
    }
  }

  function renderComment(c) {
    const isAuthor = currentUser?.id === c.authorId;
    const isAdmin =
      currentUser?.role === 'admin' || currentUser?.role === 'owner';
    const canEdit = isAuthor || isAdmin;

    return (
      <div key={c.id} className="py-3 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
            {c.author?.name?.[0]?.toUpperCase() ||
              c.author?.username?.[0]?.toUpperCase() ||
              'U'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {c.author?.name || c.author?.username || c.authorId}{' '}
              <span className="text-xs text-gray-400 ml-2 font-normal">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <div
              className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: c.content }}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {renderReactions(c)}
                <button
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                  onClick={() => replyTo(c.id)}
                >
                  Reply
                </button>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    className="text-xs text-gray-600 hover:text-gray-800"
                    onClick={() => editComment(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={() => deleteComment(c.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function replyTo(parentId) {
    const reply = prompt('Reply:');
    if (!reply) return;
    setNewContent(reply);
    setTimeout(() => postComment(parentId), 50);
  }

  function editComment(comment) {
    const updated = prompt('Edit comment:', comment.content.replace(/<[^>]*>/g, ''));
    if (!updated || updated === comment.content) return;

    api
      .put(`/comments/${comment.id}`, { content: updated })
      .then((res) => {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, content: res.data.content } : c
          )
        );
      })
      .catch(() => setError('Failed to edit comment'));
  }

  function deleteComment(id) {
    if (!confirm('Delete this comment?')) return;

    api
      .delete(`/comments/${id}`)
      .then(() => {
        setComments((prev) => prev.filter((c) => c.id !== id));
      })
      .catch(() => setError('Failed to delete comment'));
  }

  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h4 className="font-semibold mb-3">Comments</h4>

      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      <div className="mb-3">
        <textarea
          className="w-full p-2 border rounded"
          rows="3"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a comment"
        />
        <div className="flex justify-end mt-2">
          <button
            className="px-3 py-1 bg-indigo-600 text-white rounded disabled:bg-gray-400"
            onClick={() => postComment(null)}
            disabled={posting || !newContent.trim()}
          >
            {posting ? 'Posting...' : 'Post comment'}
          </button>
        </div>
      </div>

      <div>
        {/* Load more older comments */}
        {hasMore && (
          <div className="text-center mb-3">
            <button
              onClick={loadPage}
              className="px-3 py-1 border rounded hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load older comments'}
            </button>
          </div>
        )}

        {comments.length === 0 && !loading ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No comments yet
          </div>
        ) : (
          comments.map(renderComment)
        )}
      </div>
    </div>
  );
}
