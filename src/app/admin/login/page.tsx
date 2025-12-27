'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Bitte füllen Sie alle Felder aus');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      // Erfolgreicher Login - Redirect zum Admin Dashboard
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Header - Dunkelgrau mit rotem Akzent für Admin */}
      <header 
        style={{ 
          backgroundColor: '#393939',
          height: '55px',
          minHeight: '56px',
          maxHeight: '56px'
        }} 
        className="w-full px-8 shadow-md flex items-center"
      >
        <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
        <span className="ml-4 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded">
          SUPER ADMIN
        </span>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Super-Admin Anmeldung
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            Vollzugriff auf alle Tenants und Verwaltungsbereiche
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-full max-w-md">
          {/* Admin Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <fieldset className="border border-gray-300 rounded px-3 pt-2 pb-3 relative focus-within:border-red-600 focus-within:shadow-[0_0_0_2px_rgba(220,38,38,0.1)]">
                <legend className="text-md font-medium text-gray-900 px-1">Username</legend>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-2 border-0 focus:outline-none focus:ring-0 text-base bg-white text-gray-900"
                  placeholder="admin"
                  autoComplete="username"
                />
              </fieldset>
            </div>

            {/* Password Field */}
            <div>
              <fieldset className="border border-gray-300 rounded px-3 pt-2 pb-3 relative focus-within:border-red-600 focus-within:shadow-[0_0_0_2px_rgba(220,38,38,0.1)]">
                <legend className="text-md font-medium text-gray-900 px-1">Passwort</legend>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-2 border-0 focus:outline-none focus:ring-0 text-base bg-white text-gray-900"
                  autoComplete="current-password"
                />
              </fieldset>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Submit Button - Rot für Admin */}
            <button
              type="submit"
              disabled={loading}
              className="admin-login-button w-full py-3 text-white rounded font-medium text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Anmeldung läuft...' : 'Anmelden'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
            <p className="font-semibold mb-1">⚠️ Sicherheitshinweis</p>
            <p className="text-xs">
              Dieser Bereich ist nur für autorisierte Super-Administratoren zugänglich.
              Alle Aktionen werden protokolliert.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        style={{ 
          backgroundColor: '#f2f2f2',
          borderTop: '1px solid #c6c6c6'
        }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project - Super Admin Portal
        </p>
      </footer>

      <style jsx>{`
        .admin-login-button {
          background-image: linear-gradient(#dc2626, #b91c1c 60%, #991b1b);
          border: none;
          box-shadow: 0 0 0 0 transparent;
          cursor: pointer;
        }
        
        .admin-login-button:hover:not(:disabled) {
          background-image: linear-gradient(#b91c1c, #991b1b 60%, #7f1d1d);
        }
      `}</style>
    </div>
  );
}

