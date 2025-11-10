'use client';

import React, { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login-Versuch:', { username });

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login-Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      console.log('✅ Login erfolgreich, redirect zu /dashboard');
      window.location.href = '/dashboard';

    } catch (err: any) {
      console.error('Login-Fehler:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verag Spedition GmbH</h1>
          <p className="text-gray-600">Mitarbeiter-Portal</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🔓 Anmelden</h2>
          <p className="text-gray-600">Willkommen zurück!</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benutzername
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Ihr Benutzername"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs font-semibold text-yellow-800 mb-2">💡 Test-Accounts:</p>
          <div className="text-xs text-yellow-700 space-y-1">
            <p>Admin: <code className="bg-yellow-100 px-1 rounded">admin</code> / <code className="bg-yellow-100 px-1 rounded">admin123</code></p>
            <p>Schichtleiter: <code className="bg-yellow-100 px-1 rounded">schichtleiter</code> / <code className="bg-yellow-100 px-1 rounded">schicht123</code></p>
            <p>Mitarbeiter: <code className="bg-yellow-100 px-1 rounded">sercan</code> / <code className="bg-yellow-100 px-1 rounded">sercan123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}