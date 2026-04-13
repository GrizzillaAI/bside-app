import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';

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
  // Silence TS "declared but never used" — navigate is available for future post-signup redirect.
  void navigate;

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
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-pink" />
          </div>
          <h1 className="font-display font-black text-3xl text-pearl mb-3">Check your email.</h1>
          <p className="text-silver mb-8">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account and start mixing.
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-pink/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-silver hover:text-white text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <LogoMark size={32} />
          <Wordmark size={26} />
        </div>
        <h1 className="font-display font-black text-4xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>Start mixing.</h1>
        <p className="text-silver mb-8">Free forever. No card. No catch.</p>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-cloud">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              required
              className="w-full bg-void border border-slate focus:border-pink rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-ash"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-2 text-cloud">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="w-full bg-void border border-slate focus:border-pink rounded-lg px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-ash"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ash hover:text-white transition"
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
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${check ? 'bg-pink text-white' : 'bg-slate'}`}>
                      {check && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className={check ? 'text-silver' : 'text-ash'}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid}
            className="w-full bg-pink hover:bg-pink-600 disabled:opacity-50 py-3 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-ash mt-4">
          By signing up, you agree to our Terms and Privacy Policy.
        </p>

        <p className="text-center text-sm text-silver mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="text-pink hover:text-pink-400 font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
