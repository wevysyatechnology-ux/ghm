import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ onShowSignup }: { onShowSignup?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Trim whitespace from email and password
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    console.log('Attempting login with:', { email: trimmedEmail, passwordLength: trimmedPassword.length });

    try {
      await signIn(trimmedEmail, trimmedPassword);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to sign in';

      console.error('Sign in error:', err);

      if (errorMessage.includes('infinite recursion')) {
        errorMessage = 'Database configuration error. Please run FIX_RLS_POLICIES.sql in your Supabase SQL Editor.';
      } else if (errorMessage.includes('Failed to verify user permissions')) {
        errorMessage = 'Database configuration error. Please run FIX_RLS_POLICIES.sql in your Supabase SQL Editor to fix RLS policies.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Make sure you ran SETUP_DATABASE.sql to create the admin user.';
      } else if (errorMessage.includes('pending approval')) {
        errorMessage = 'Your account is pending approval. Please contact an administrator.';
      } else if (errorMessage.includes('rejected')) {
        errorMessage = 'Your account has been rejected. Please contact an administrator.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0B0F0E' }}>
      <div className="absolute top-20 left-32 w-[500px] h-[300px] gradient-pill opacity-20" />
      <div className="absolute top-40 right-[-100px] w-[800px] h-[800px] gradient-blob-teal opacity-25" />
      <div className="absolute bottom-[-200px] left-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[200px] gradient-pill-horizontal opacity-15" />
      <div className="absolute bottom-20 right-20 w-96 h-96 gradient-orb opacity-20" />

      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        <div className="bg-card rounded-3xl p-8 border border-gray-800/50 transition-all-smooth hover-lift glass-shine">
          <div className="flex justify-center mb-6 relative">
            <div className="absolute w-32 h-32 rounded-full gradient-orb animate-glow" />
            <div className="relative animate-float">
              <img
                src="/Media/wevysyalogo.png"
                alt="WeVysya Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 animate-fade-in">Welcome to WeVysya</h1>
            <p className="text-[#9CA3AF] animate-fade-in" style={{ animationDelay: '0.1s' }}>Global House Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                placeholder="admin@wevysya.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-all-smooth disabled:opacity-50 hover:brightness-110"
              style={{
                backgroundColor: '#4ADE80',
                color: '#0B0F0E'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {onShowSignup && (
              <div className="text-center pt-4 border-t border-gray-800">
                <p className="text-[#9CA3AF] text-sm mb-3">Don't have an account?</p>
                <button
                  type="button"
                  onClick={onShowSignup}
                  className="text-[#6EE7B7] hover:text-[#4ADE80] font-medium transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
