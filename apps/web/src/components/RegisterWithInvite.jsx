import React, { useState } from 'react';
import { api } from '../api/apiClient';

export default function RegisterWithInvite({ initialEmail = '', inviteToken = '', onSuccess }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { email, password, name, inviteToken };
      const res = await api.post('/auth/register', body);
      // Assume response contains token
      const token = res?.token || res?.access_token;
      if (token) {
        localStorage.setItem('token', token);
      }
      onSuccess && onSuccess(res);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm block mb-1 font-medium text-gray-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          placeholder="Your full name"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="text-sm block mb-1 font-medium text-gray-700">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="text-sm block mb-1 font-medium text-gray-700">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          placeholder="••••••••"
          minLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Registering…' : 'Register & Join'}
        </button>
      </div>
      {error ? (
        <div className="text-red-600 bg-red-50 p-3 rounded text-sm">{error}</div>
      ) : null}
    </form>
  );
}
