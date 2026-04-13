import { useState } from 'react';
import { Plus, Play, Music, X, ListMusic } from 'lucide-react';

const MOCK_PLAYLISTS = [
  { id: '1', name: 'Commute Mix', tracks: 24, desc: 'Perfect for the morning ride' },
  { id: '2', name: 'Live Sessions', tracks: 18, desc: 'Tiny Desk, KEXP, Boiler Room' },
  { id: '3', name: 'Late Night Vibes', tracks: 31, desc: 'Chill beats after dark' },
];

const GRADIENTS = [
  'from-[#FF4F2B] to-[#E63D1A]',
  'from-[#ec4899] to-[#be185d]',
  'from-[#f59e0b] to-[#d97706]',
  'from-[#10b981] to-[#059669]',
];

export default function Playlists() {
  const [playlists, setPlaylists] = useState(MOCK_PLAYLISTS);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    setPlaylists([{ id: Date.now().toString(), name: newName, tracks: 0, desc: newDesc }, ...playlists]);
    setNewName(''); setNewDesc(''); setShowModal(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Playlists</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#FF4F2B] hover:bg-[#E63D1A] px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-20">
          <ListMusic className="w-12 h-12 text-[#1E1E2A] mx-auto mb-4" />
          <p className="text-[#5A5A72] mb-4">No playlists yet. Create one to organize your audio.</p>
          <button onClick={() => setShowModal(true)} className="bg-[#FF4F2B] hover:bg-[#E63D1A] px-5 py-2.5 rounded-lg text-sm font-semibold transition">
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl, i) => (
            <div key={pl.id} className="bg-[#0E0E14] border border-[#1E1E2A] hover:border-[#FF4F2B]/30 rounded-xl overflow-hidden transition cursor-pointer group">
              <div className={`h-32 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center relative`}>
                <Music className="w-10 h-10 text-white/40" />
                <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  </div>
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1">{pl.name}</h3>
                <p className="text-xs text-[#5A5A72]">{pl.tracks} tracks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#1E1E2A]">
              <h2 className="text-lg font-bold">Create Playlist</h2>
              <button onClick={() => setShowModal(false)} className="text-[#5A5A72] hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Playlist"
                  className="w-full bg-[#08080C] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder:text-[#5A5A72]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's this playlist about?"
                  rows={3}
                  className="w-full bg-[#08080C] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-2.5 text-sm outline-none transition resize-none placeholder:text-[#5A5A72]"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#1E1E2A]">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-[#1E1E2A] hover:bg-[#333] rounded-lg text-sm font-medium transition">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 py-2.5 bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-40 rounded-lg text-sm font-semibold transition">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
