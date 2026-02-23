import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import type { House } from '../types';

export default function Signup({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    mobile: '',
    business: '',
    industry: '',
    house_id: '',
  });
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('name');

      if (error) throw error;
      setHouses(data || []);
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: formData.full_name,
            mobile: formData.mobile || null,
            business: formData.business || null,
            industry: formData.industry || null,
            house_id: formData.house_id || null,
          },
        },
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please login instead.');
        }
        throw new Error(authError.message || 'Failed to create account');
      }

      if (!authData?.user) {
        throw new Error('Failed to create account - no user returned');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabase.auth.signOut();

      setSuccess(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="absolute top-20 left-32 w-[500px] h-[300px] gradient-pill opacity-20" />
        <div className="absolute top-40 right-[-100px] w-[800px] h-[800px] gradient-blob-teal opacity-25" />
        <div className="absolute bottom-[-200px] left-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />

        <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
          <div className="bg-card rounded-3xl p-8 border border-gray-800/50 transition-all-smooth glass-shine">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-green-900/30 flex items-center justify-center ring-2 ring-[#6EE7B7]/30">
                <CheckCircle className="w-10 h-10 text-[#6EE7B7]" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Registration Successful!</h1>
              <p className="text-[#9CA3AF] mb-4">Your account has been created and is pending approval.</p>
              <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-800/50 text-yellow-400 text-sm">
                <p className="font-medium mb-2">What happens next?</p>
                <ul className="text-left space-y-2 text-yellow-300/90">
                  <li>• Your registration will be reviewed by an administrator</li>
                  <li>• You'll receive an email once your account is approved</li>
                  <li>• After approval, you can login with your credentials</li>
                </ul>
              </div>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full py-3 rounded-xl font-semibold transition-all-smooth hover:brightness-110"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0B0F0E' }}>
      <div className="absolute top-20 left-32 w-[500px] h-[300px] gradient-pill opacity-20" />
      <div className="absolute top-40 right-[-100px] w-[800px] h-[800px] gradient-blob-teal opacity-25" />
      <div className="absolute bottom-[-200px] left-[-150px] w-[700px] h-[700px] gradient-blob-green opacity-20" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[200px] gradient-pill-horizontal opacity-15" />
      <div className="absolute bottom-20 right-20 w-96 h-96 gradient-orb opacity-20" />

      <div className="relative z-10 w-full max-w-2xl px-6 animate-slide-up">
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
            <h1 className="text-3xl font-bold mb-2 animate-fade-in">Join WeVysya</h1>
            <p className="text-[#9CA3AF] animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Create your account and become a member
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Business</label>
                <input
                  type="text"
                  value={formData.business}
                  onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="Technology Solutions"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  placeholder="Information Technology"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Select House *</label>
                <select
                  value={formData.house_id}
                  onChange={(e) => setFormData({ ...formData, house_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                  required
                >
                  <option value="">-- Select a House --</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name} - {house.zone}, {house.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
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

              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-[#0F1412] border border-gray-800 text-white placeholder-gray-600 focus:outline-none input-glow transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-900/20 border border-blue-800/50 text-blue-400 text-sm">
              <p className="font-medium mb-1">Account Approval Required</p>
              <p className="text-blue-300/80 text-xs">
                Your account will be reviewed by an administrator before you can login.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-all-smooth disabled:opacity-50 hover:brightness-110 flex items-center justify-center space-x-2"
              style={{ backgroundColor: '#4ADE80', color: '#0B0F0E' }}
            >
              <UserPlus size={20} />
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-3 rounded-xl font-semibold bg-[#0F1412] border border-gray-800 text-white hover:bg-[#14532D] transition-all"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
