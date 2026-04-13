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
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5E5E7A] uppercase tracking-wider mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2D87] to-[#E01570] flex items-center justify-center text-xl font-bold">{initial}</div>
          <div>
            <p className="font-semibold text-lg">{displayName}</p>
            <p className="text-sm text-[#5E5E7A]">{displayEmail}</p>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5E5E7A] uppercase tracking-wider mb-4">Subscription</h2>
        <div className="bg-[#050509] border border-[#1A1A28] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#5E5E7A]">Current Plan</span>
            <span className="text-xs font-semibold bg-[#1A1A28] px-2 py-1 rounded">FREE</span>
          </div>
          <ul className="space-y-2 text-sm text-[#A0A0B8]">
            {['Streaming with ads', 'Up to 3 playlists', '50 tracks in library', 'Standard quality', '10 searches/day'].map(f => (
              <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#FF2D87]" /> {f}</li>
            ))}
          </ul>
        </div>
        <button className="w-full bg-gradient-to-r from-[#FF2D87] to-[#E01570] hover:opacity-90 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" /> Upgrade to Premium — $4.99/mo
        </button>
      </div>

      {/* Preferences */}
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5E5E7A] uppercase tracking-wider mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#5E5E7A]" />
              <div>
                <p className="text-sm font-medium">Audio Quality</p>
                <p className="text-xs text-[#5E5E7A]">Higher quality uses more data</p>
              </div>
            </div>
            <select
              value={quality} onChange={(e) => setQuality(e.target.value)}
              className="bg-[#050509] border border-[#1A1A28] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#FF2D87]"
            >
              <option value="standard">Standard</option>
              <option value="high" disabled>High (Premium)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#5E5E7A]" />
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-[#5E5E7A]">New features and updates</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-11 h-6 rounded-full transition relative ${notifications ? 'bg-[#FF2D87]' : 'bg-[#1A1A28]'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notifications ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#5E5E7A] uppercase tracking-wider mb-4">Account</h2>
        <button
          onClick={handleSignOut}
          className="w-full bg-[#1A1A28] hover:bg-[#333] py-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
