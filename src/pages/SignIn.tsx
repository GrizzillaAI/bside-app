import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';
import { Button, Input } from '../components/ui';

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
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-pink/15 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-silver hover:text-pearl text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <LogoMark size={32} />
          <Wordmark size={26} />
        </div>
        <h1 className="font-display font-black text-4xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>Welcome back.</h1>
        <p className="text-silver mb-8">Sign in and pick up where you left off.</p>

        {error && (
          <div role="alert" className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="signin-password" className="text-sm font-medium text-cloud">Password</label>
              <Link to="/forgot-password" className="text-xs text-pink hover:text-pink-400 transition">
                Forgot password?
              </Link>
            </div>
            <Input
              id="signin-password"
              label="Password"
              labelHidden
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-silver mt-6">
          New here?{' '}
          <Link to="/signup" className="text-pink hover:text-pink-400 font-medium transition">
            Start mixing free
          </Link>
        </p>
      </div>
    </div>
  );
}
