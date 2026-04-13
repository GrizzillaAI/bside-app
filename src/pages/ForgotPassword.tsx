import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Music, Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF4F2B]/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#FF4F2B]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-[#9898AA] mb-8">
            If an account exists for <strong className="text-white">{email}</strong>,
            we sent a password reset link.
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
      <div className="w-full max-w-md">
        <Link to="/signin" className="inline-flex items-center gap-2 text-[#9898AA] hover:text-white text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Music className="w-8 h-8 text-[#FF4F2B]" />
          <span className="text-2xl font-bold">B-Side</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
        <p className="text-[#9898AA] mb-8">Enter your email and we'll send you a reset link</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-sm text-red-400">{error}</div>
        )}

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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-50 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
