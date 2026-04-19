import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';
import { Button, Input } from '../components/ui';

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
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-6" aria-hidden="true">
            <Check className="w-8 h-8 text-pink" />
          </div>
          <h1 className="font-display font-black text-3xl text-pearl mb-3">Check your email.</h1>
          <p className="text-silver mb-8">
            We sent a confirmation link to <strong className="text-pearl">{email}</strong>.
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-pink/15 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

      <div className="relative w-full max-w-md py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-silver hover:text-pearl text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <LogoMark size={32} />
          <Wordmark size={26} />
        </div>
        <h1 className="font-display font-black text-4xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>Start mixing.</h1>
        <p className="text-silver mb-8">Free forever. No card. No catch.</p>

        {error && (
          <div role="alert" className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            required
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <div>
            <Input
              id="signup-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="text-silver hover:text-pearl transition p-1 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              }
            />
            {password && (
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {[
                  { check: passwordChecks.length, label: 'At least 8 characters' },
                  { check: passwordChecks.upper, label: 'One uppercase letter' },
                  { check: passwordChecks.number, label: 'One number' },
                ].map(({ check, label }) => (
                  <li key={label} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${check ? 'bg-pink text-ink' : 'bg-graphite border border-slate'}`} aria-hidden="true">
                      {check && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </div>
                    <span className={check ? 'text-cloud' : 'text-silver'}>
                      <span className="sr-only">{check ? 'Met: ' : 'Not met: '}</span>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!passwordValid}
            fullWidth
            className="mt-2"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-xs text-silver mt-4">
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
