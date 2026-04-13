import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Music, Loader2, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
  const passwordValid = passwordChecks.length && passwordChecks.upper && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return;
    setError('');
    setLoading(true);

    const { error } = await signUp(email, password, username);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4F2B]/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#FF4F2B]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-[#9898AA] mb-8">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click the link to activate your account.
          </p>
          <Link to="/signin" className="text-[#FF4F2B] hover:text-[#FF6B4A] text-sm font-medium transition">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080C] flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#FF4F2B]/10 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-[#9898AA] hover:text-white text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Music className="w-8 h-8 text-[#FF4F2B]" />
          <span className="text-2xl font-bold">B-Side</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Create your account</h1>
        <p className="text-[#9898AA] mb-8">Start building your audio library for free</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              required
              className="w-full bg-[#0E0E14] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-[#5A5A72]"
            />
          </div>

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
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
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
            {password && (
              <div className="mt-3 space-y-1.5">
                {[
                  { check: passwordChecks.length, label: 'At least 8 characters' },
                  { check: passwordChecks.upper, label: 'One uppercase letter' },
                  { check: passwordChecks.number, label: 'One number' },
                ].map(({ check, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${check ? 'bg-[#FF4F2B]' : 'bg-[#1E1E2A]'}`}>
                      {check && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className={check ? 'text-[#9898AA]' : 'text-[#5A5A72]'}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid}
            className="w-full bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-50 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-[#5A5A72] mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="text-center text-sm text-[#9898AA] mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="text-[#FF4F2B] hover:text-[#FF6B4A] font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
