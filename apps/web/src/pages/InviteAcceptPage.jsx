import React, { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import { useNavigate } from 'react-router-dom';
import RegisterWithInvite from '../components/RegisterWithInvite';

export default function InviteAcceptPage() {
  const [token, setToken] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setError('Missing invite token');
      setLoading(false);
      return;
    }
    setToken(t);

    // Check if logged in by checking token in localStorage
    const tokenLocal = localStorage.getItem('token');
    setIsLoggedIn(!!tokenLocal);

    // Fetch invite metadata
    api
      .get(`/invite/check?token=${encodeURIComponent(t)}`)
      .then((res) => {
        setInvite(res);
        if (res.email) setEmail(res.email);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Invalid invite');
      })
      .finally(() => setLoading(false));
  }, []);

  async function acceptAsLoggedIn() {
    try {
      setLoading(true);
      await api.post(`/invite/${token}/accept`, {});
      // Success - redirect to org page or dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-xl w-full bg-white p-8 rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : null}

        {error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>
        ) : null}

        {!loading && invite && (
          <>
            <h2 className="text-2xl font-bold mb-4">You&apos;ve been invited</h2>
            <div className="mb-6 space-y-2">
              <p className="text-gray-700">
                <span className="font-semibold">Organization:</span>{' '}
                <strong>{invite.organization?.name || invite.organizationId || '—'}</strong>
              </p>
              {invite.organization?.description && (
                <p className="text-gray-600 text-sm">{invite.organization.description}</p>
              )}
              <p className="text-gray-700">
                <span className="font-semibold">Role:</span>{' '}
                <strong className="capitalize">{invite.roleKey}</strong>
              </p>
            </div>

            {isLoggedIn ? (
              <>
                <p className="mb-4 text-gray-700">
                  You are signed in. Click below to join the organization.
                </p>
                <button
                  onClick={acceptAsLoggedIn}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Join organization
                </button>
              </>
            ) : (
              <>
                <p className="mb-4 text-gray-700">
                  Not signed in? Register a new account to accept the invite.
                </p>
                <RegisterWithInvite
                  initialEmail={email}
                  inviteToken={token}
                  onSuccess={() => navigate('/dashboard')}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
