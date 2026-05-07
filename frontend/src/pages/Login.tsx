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

      {/* Silhouette: two women in hijab from behind, holding hands */}
      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ opacity: 0.14 }}
        width="480" height="380" viewBox="0 0 480 380"
        xmlns="http://www.w3.org/2000/svg"
        fill="white"
        aria-hidden="true"
      >
        {/* Left woman */}
        <ellipse cx="135" cy="52" rx="22" ry="25" />
        {/* Hijab drape */}
        <path d="M113,58 C100,76 94,106 92,138 C110,130 122,126 135,124 C148,126 160,130 178,138 C176,106 170,76 157,58 Z" />
        {/* Abaya */}
        <path d="M92,138 C86,166 80,202 75,244 C71,278 70,316 70,380 L106,380 C106,350 108,318 110,294 C114,318 116,350 116,380 L156,380 C156,350 154,316 156,280 C160,240 174,166 178,138 Z" />
        {/* Right arm reaching inward toward center */}
        <path d="M174,162 C186,175 198,186 216,196 C220,198 224,194 220,189 C209,180 196,167 178,152 Z" />

        {/* Right woman — mirror of left around x=240 */}
        <g transform="translate(480,0) scale(-1,1)">
          <ellipse cx="135" cy="52" rx="22" ry="25" />
          <path d="M113,58 C100,76 94,106 92,138 C110,130 122,126 135,124 C148,126 160,130 178,138 C176,106 170,76 157,58 Z" />
          <path d="M92,138 C86,166 80,202 75,244 C71,278 70,316 70,380 L106,380 C106,350 108,318 110,294 C114,318 116,350 116,380 L156,380 C156,350 154,316 156,280 C160,240 174,166 178,138 Z" />
          <path d="M174,162 C186,175 198,186 216,196 C220,198 224,194 220,189 C209,180 196,167 178,152 Z" />
        </g>

        {/* Joined hands */}
        <ellipse cx="240" cy="193" rx="22" ry="12" opacity="0.75" />
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
