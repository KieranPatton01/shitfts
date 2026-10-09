import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SignIn: React.FC = () => {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email format sanitization regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Sanitize inputs
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      await loginWithEmail(cleanEmail, cleanPassword);
    } catch (err: any) {
      const code = err?.code || '';
      // Map Firebase error codes to clean, sanitized user messages
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Unable to sign in. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-container-lowest border border-surface-container-high rounded-3xl p-7 shadow-sm flex flex-col gap-6 animate-in fade-in">
        {/* App Branding */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="text-2xl font-bold font-headline">S</span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight mt-1">
            shitfts
          </h1>
          <p className="text-xs text-on-surface-variant">
            Sign in to access your weekly schedule
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-error-container text-on-error-container px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@example.com"
              className="w-full h-11 px-3.5 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
