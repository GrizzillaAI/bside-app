import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Music, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-[#08080C] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#FF4F2B]/10 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-[#9898AA] hover:text-white text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Music className="w-8 h-8 text-[#FF4F2B]" />
          <span className="text-2xl font-bold">B-Side</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-[#9898AA] mb-8">Sign in to your account to continue</p>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0E0E14] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-[#5A5A72]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#FF4F2B] hover:text-[#FF6B4A] transition">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-[#0E0E14] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-[#5A5A72]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A5A72] hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-50 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-[#9898AA] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#FF4F2B] hover:text-[#FF6B4A] font-medium transition">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
