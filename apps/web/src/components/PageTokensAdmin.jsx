import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function PageTokensAdmin({ orgId }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    allowedOrigins: '',
  });

  useEffect(() => {
    loadTokens();
  }, [orgId]);

  async function loadTokens() {
    try {
      setLoading(true);
      const { data } = await api.get(`/organization/${orgId}/widget-admin/page-tokens`);
      setTokens(data);
    } catch (error) {
      console.error('Failed to load page tokens:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const origins = formData.allowedOrigins
        ? formData.allowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;

      const { data } = await api.post(`/organization/${orgId}/widget-admin/page-tokens`, {
        description: formData.description || undefined,
        allowedOrigins: origins,
      });

      setNewToken(data);
      setFormData({ description: '', allowedOrigins: '' });
      loadTokens();
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('Failed to create token: ' + (error.response?.data?.message || error.message));
    }
  }

  async function handleRevoke(tokenId) {
    if (!confirm('Are you sure you want to revoke this token? Widget embeds using this token will stop working.')) {
      return;
    }

    try {
      await api.delete(`/organization/${orgId}/widget-admin/page-tokens/${tokenId}`);
      loadTokens();
    } catch (error) {
      console.error('Failed to revoke token:', error);
      alert('Failed to revoke token');
    }
  }

  async function handleCopy(token) {
    try {
      await navigator.clipboard.writeText(token);
      alert('Token copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = token;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('Token copied to clipboard!');
    }
  }

  function copyEmbedCode(token) {
    const embedCode = `<!-- Workflo Widget -->
<script>
  window.WorkfloWidgetConfig = {
    pageToken: "${token}",
    apiBase: "${window.location.origin}",
    widgetUrl: "${window.location.origin}/workflo-widget-app.js"
  };
</script>
<script src="${window.location.origin}/workflo-widget-v1.js" async></script>`;

    handleCopy(embedCode);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Widget Page Tokens</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create tokens to embed the Workflo widget on your websites
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Token
        </button>
      </div>

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No page tokens yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first token →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map(token => (
            <div key={token.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {token.description || 'Unnamed Token'}
                    </h4>
                    {token.allowedOrigins && token.allowedOrigins.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Origin Restricted
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-500">Token:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded">{token.token}</code>
                    </div>
                    {token.allowedOrigins && token.allowedOrigins.length > 0 && (
                      <div>
                        <span className="text-gray-500">Allowed Origins:</span>
                        <div className="ml-2 text-xs">
                          {token.allowedOrigins.map((origin, idx) => (
                            <div key={idx} className="text-gray-700">{origin}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Created {new Date(token.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => copyEmbedCode(token.token)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    title="Copy embed code"
                  >
                    📋 Embed Code
                  </button>
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Create Page Token</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Marketing website, Documentation site"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Origins (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.allowedOrigins}
                    onChange={(e) => setFormData({ ...formData, allowedOrigins: e.target.value })}
                    placeholder="https://example.com, https://*.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Comma-separated list of origins. Use * for wildcards. Leave empty to allow all origins.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ description: '', allowedOrigins: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Created Modal */}
      {newToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h2 className="text-2xl font-bold">Token Created Successfully!</h2>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Save this token securely. It will not be shown again!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Token
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
                      {newToken.token}
                    </code>
                    <button
                      onClick={() => handleCopy(newToken.token)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Embed Code
                  </label>
                  <div className="relative">
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
{`<!-- Workflo Widget -->
<script>
  window.WorkfloWidgetConfig = {
    pageToken: "${newToken.token}",
    apiBase: "${window.location.origin}",
    widgetUrl: "${window.location.origin}/workflo-widget-app.js"
  };
</script>
<script src="${window.location.origin}/workflo-widget-v1.js" async></script>`}
                    </pre>
                    <button
                      onClick={() => copyEmbedCode(newToken.token)}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setNewToken(null);
                  setShowCreateModal(false);
                }}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
