import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle } from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';
import { Button, Input } from '../components/ui';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase injects the recovery token via the URL hash — the client lib
  // picks it up automatically and sets a session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // In case the session is already set (page reload)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/app'), 2500);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="font-display font-black text-3xl text-pearl mb-3">Password updated!</h1>
          <p className="text-silver">Redirecting you to the app…</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-pink/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-pink" />
          </div>
          <h1 className="font-display font-black text-3xl text-pearl mb-3">Invalid or expired link.</h1>
          <p className="text-silver mb-8">
            This password reset link may have expired. Request a new one.
          </p>
          <Link to="/forgot-password" className="text-pink hover:text-pink-400 text-sm font-medium transition">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <LogoMark size={32} />
          <Wordmark size={26} />
        </div>
        <h1 className="font-display font-black text-4xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>New password.</h1>
        <p className="text-silver mb-8">Choose a new password for your account.</p>

        {error && (
          <div role="alert" className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 mb-6 text-sm text-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your new password"
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
          >
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
