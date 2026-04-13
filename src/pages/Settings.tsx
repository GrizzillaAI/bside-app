import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, CreditCard, LogOut, Crown, Check, Bell, Volume2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [quality, setQuality] = useState('standard');
  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initial = (displayName[0] ?? 'U').toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5A5A72] uppercase tracking-wider mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF4F2B] to-[#E63D1A] flex items-center justify-center text-xl font-bold">{initial}</div>
          <div>
            <p className="font-semibold text-lg">{displayName}</p>
            <p className="text-sm text-[#5A5A72]">{displayEmail}</p>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5A5A72] uppercase tracking-wider mb-4">Subscription</h2>
        <div className="bg-[#08080C] border border-[#1E1E2A] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#5A5A72]">Current Plan</span>
            <span className="text-xs font-semibold bg-[#1E1E2A] px-2 py-1 rounded">FREE</span>
          </div>
          <ul className="space-y-2 text-sm text-[#9898AA]">
            {['Streaming with ads', 'Up to 3 playlists', '50 tracks in library', 'Standard quality', '10 searches/day'].map(f => (
              <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#FF4F2B]" /> {f}</li>
            ))}
          </ul>
        </div>
        <button className="w-full bg-gradient-to-r from-[#FF4F2B] to-[#E63D1A] hover:opacity-90 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" /> Upgrade to Premium — $4.99/mo
        </button>
      </div>

      {/* Preferences */}
      <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5A5A72] uppercase tracking-wider mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#5A5A72]" />
              <div>
                <p className="text-sm font-medium">Audio Quality</p>
                <p className="text-xs text-[#5A5A72]">Higher quality uses more data</p>
              </div>
            </div>
            <select
              value={quality} onChange={(e) => setQuality(e.target.value)}
              className="bg-[#08080C] border border-[#1E1E2A] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#FF4F2B]"
            >
              <option value="standard">Standard</option>
              <option value="high" disabled>High (Premium)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#5A5A72]" />
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-[#5A5A72]">New features and updates</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-11 h-6 rounded-full transition relative ${notifications ? 'bg-[#FF4F2B]' : 'bg-[#1E1E2A]'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notifications ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5A5A72] uppercase tracking-wider mb-4">Account</h2>
        <button
          onClick={handleSignOut}
          className="w-full bg-[#1E1E2A] hover:bg-[#333] py-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
