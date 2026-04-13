import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';

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
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-pink" />
          </div>
          <h1 className="font-display font-black text-3xl text-pearl mb-3">Check your email.</h1>
          <p className="text-silver mb-8">
            If an account exists for <strong className="text-white">{email}</strong>,
            we sent a password reset link.
          </p>
          <Link to="/signin" className="text-pink hover:text-pink-400 text-sm font-medium transition">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/signin" className="inline-flex items-center gap-2 text-silver hover:text-white text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <LogoMark size={32} />
          <Wordmark size={26} />
        </div>
        <h1 className="font-display font-black text-4xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>Reset password.</h1>
        <p className="text-silver mb-8">Enter your email — we'll send a reset link.</p>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6 text-sm text-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-cloud">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-void border border-slate focus:border-pink rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-ash"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink hover:bg-pink-600 disabled:opacity-50 py-3 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
}
