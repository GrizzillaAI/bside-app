import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { completeSpotifyOAuth } from '../lib/spotify';

/**
 * Lands here after Spotify authorization. Exchanges the auth code for tokens
 * via the Supabase Edge Function, then redirects the user back to where they
 * came from (typically /app/settings).
 */
export default function SpotifyCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'success' | 'error'>('working');
  const [message, setMessage] = useState('Connecting your Spotify account...');

  useEffect(() => {
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error) {
      setStatus('error');
      setMessage(`Spotify denied the request: ${error}. You can try again from Settings.`);
      return;
    }
    if (!code || !state) {
      setStatus('error');
      setMessage('Missing authorization data. Please try connecting again.');
      return;
    }

    (async () => {
      const result = await completeSpotifyOAuth(code, state);
      if (result.ok) {
        setStatus('success');
        setMessage('Spotify connected. Redirecting...');
        setTimeout(() => navigate(result.returnTo, { replace: true }), 1200);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-void border border-slate rounded-2xl p-8 text-center">
        <div className="mb-4 flex justify-center">
          {status === 'working' && <Loader2 className="w-10 h-10 text-pink animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-10 h-10 text-success" />}
          {status === 'error' && <AlertCircle className="w-10 h-10 text-error" />}
        </div>
        <h1 className="font-display font-black text-2xl text-pearl mb-2" style={{ letterSpacing: '-0.02em' }}>
          {status === 'working' && 'Connecting Spotify'}
          {status === 'success' && 'Connected'}
          {status === 'error' && 'Connection failed'}
        </h1>
        <p className="text-sm text-silver mb-6">{message}</p>
        {status === 'error' && (
          <button
            onClick={() => navigate('/app/settings', { replace: true })}
            className="bg-pink hover:bg-pink-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            Back to Settings
          </button>
        )}
      </div>
    </div>
  );
}
