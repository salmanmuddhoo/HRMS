import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-8">

      {/* Deep emerald gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #0a2d1a 0%, #1a5c35 50%, #0d3d26 100%)' }}
      />

      {/* Islamic geometric star pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.08 }}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="starPattern" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
            {/* 8-pointed star (outer r=35, inner r=14, center 45,45) */}
            <polygon
              points="45,10 50.4,32.1 69.7,20.3 57.9,39.6 80,45 57.9,50.4 69.7,69.7 50.4,57.9 45,80 39.6,57.9 20.3,69.7 32.1,50.4 10,45 32.1,39.6 20.3,20.3 39.6,32.1"
              fill="none" stroke="#d4af37" strokeWidth="1.2"
            />
            <circle cx="45" cy="45" r="5" fill="none" stroke="#d4af37" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#starPattern)" />
      </svg>

      {/* Page content */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-10">
          {/* Gold ornamental divider with star */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-16 bg-amber-400" style={{ opacity: 0.55 }} />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#d4af37" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <polygon points="8,0 9.6,5.5 15.5,5.5 10.8,8.9 12.5,14.5 8,11 3.5,14.5 5.2,8.9 0.5,5.5 6.4,5.5" />
            </svg>
            <div className="h-px w-16 bg-amber-400" style={{ opacity: 0.55 }} />
          </div>

          <h1
            className="text-6xl font-bold text-white"
            style={{
              fontFamily: "'Georgia', 'Palatino Linotype', 'Palatino', serif",
              letterSpacing: '0.1em',
              textShadow: '0 2px 24px rgba(0,0,0,0.5)',
            }}
          >
            Masar
          </h1>

          <p
            className="text-5xl text-amber-300 mt-1 leading-tight"
            style={{
              fontFamily: "'Georgia', serif",
              textShadow: '0 2px 14px rgba(0,0,0,0.4)',
            }}
          >
            مسار
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-amber-300" style={{ opacity: 0.4 }} />
            <p
              className="text-amber-200 text-[10px] tracking-[0.22em] uppercase"
              style={{ opacity: 0.65 }}
            >
              Leave &amp; Payroll Management
            </p>
            <div className="h-px w-10 bg-amber-300" style={{ opacity: 0.4 }} />
          </div>
        </div>

        {/* Login card — glassmorphism */}
        <div
          className="rounded-2xl p-7 shadow-2xl backdrop-blur-md"
          style={{
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}
              >
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-semibold mb-1.5 tracking-[0.18em] uppercase"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  caretColor: '#d4af37',
                }}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold mb-1.5 tracking-[0.18em] uppercase"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  caretColor: '#d4af37',
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c 0%, #e8c86d 100%)',
                  color: '#1a2e14',
                  boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
