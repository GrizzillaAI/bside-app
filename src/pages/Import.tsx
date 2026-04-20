// Import — Tabbed import page for YouTube and Spotify playlist import.

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Youtube, Music } from 'lucide-react';
import ImportYouTube from './ImportYouTube';
import ImportSpotify from './ImportSpotify';

type ImportTab = 'youtube' | 'spotify';

export default function Import() {
  const location = useLocation();
  const initialTab: ImportTab = location.pathname.includes('spotify') ? 'spotify' : 'youtube';
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab);

  return (
    <div className="max-w-4xl">
      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#1A1A28] pb-3">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'youtube'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'text-[#5E5E7A] hover:text-[#EDEDF3] hover:bg-[#1A1A28]'
          }`}
        >
          <Youtube className="w-4 h-4" />
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'spotify'
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'text-[#5E5E7A] hover:text-[#EDEDF3] hover:bg-[#1A1A28]'
          }`}
        >
          <Music className="w-4 h-4" />
          Spotify
        </button>
      </div>

      {/* Active tab content */}
      {activeTab === 'youtube' ? <ImportYouTube /> : <ImportSpotify />}
    </div>
  );
}
