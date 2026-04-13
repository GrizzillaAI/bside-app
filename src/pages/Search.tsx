import { useState, useRef, useEffect } from 'react';
import {
  Search as SearchIcon, Play, Pause, Clock, User, Plus, Loader2,
  ThumbsUp, ThumbsDown, MessageCircle, ListPlus, ChevronDown, ChevronUp,
  Send, Trash2, X
} from 'lucide-react';
import { usePlayer, formatTime } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import { searchYouTube, extractAudio, saveTrackToLibrary, setReaction, addComment, getComments } from '../lib/api';
import type { SearchResult } from '../lib/api';

// ── Format view counts ──────────────────────────────────────────────────
function formatViews(count: string): string {
  const n = parseInt(count);
  if (isNaN(n)) return count;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Comment Panel ───────────────────────────────────────────────────────
function CommentPanel({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getComments(trackId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [trackId]);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await addComment(trackId, body.trim());
      setComments((c) => [comment, ...c]);
      setBody('');
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  };

  return (
    <div className="bg-[#16161F] border border-[#333] rounded-lg mt-2 p-4 max-h-72 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#9898AA]">Comments</span>
        <button onClick={onClose} className="text-[#5A5A72] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Post input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePost()}
          placeholder="Add a comment..."
          maxLength={1000}
          className="flex-1 bg-[#08080C] border border-[#333] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#FF4F2B] transition placeholder:text-[#555]"
        />
        <button
          onClick={handlePost}
          disabled={!body.trim() || posting}
          className="bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-40 px-3 py-2 rounded-lg transition"
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <p className="text-xs text-[#555] text-center py-4">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[#555] text-center py-4">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#FF4F2B]/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                {(c.profile?.username?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[#9898AA]">{c.profile?.username ?? 'User'}</span>
                <p className="text-[#ccc] mt-0.5 break-words">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Search Result Card ──────────────────────────────────────────────────
function ResultCard({ result }: { result: SearchResult }) {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeDelta, setLikeDelta] = useState(0);
  const [dislikeDelta, setDislikeDelta] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);

  const isThisPlaying = currentTrack?.source_id === result.video_id;

  const handlePlay = async () => {
    if (isThisPlaying) {
      togglePlayPause();
      return;
    }

    setExtracting(true);
    try {
      const audio = await extractAudio(result.video_id);
      const track: PlayerTrack = {
        title: result.title,
        artist: result.channel_title,
        thumbnail_url: result.thumbnail_url,
        audio_url: audio.audio_url,
        duration_seconds: result.duration_seconds,
        source_platform: 'youtube',
        source_id: result.video_id,
        source_url: `https://www.youtube.com/watch?v=${result.video_id}`,
      };
      play(track);
    } catch (e) {
      console.error('Extraction failed:', e);
    }
    setExtracting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveTrackToLibrary({
        title: result.title,
        artist: result.channel_title,
        source_platform: 'youtube',
        source_url: `https://www.youtube.com/watch?v=${result.video_id}`,
        source_id: result.video_id,
        thumbnail_url: result.thumbnail_url,
        duration_seconds: result.duration_seconds,
      });
      setTrackId(saved.id);
      setSaved(true);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!trackId) {
      // Auto-save first so we have a track_id for the reaction
      try {
        const saved = await saveTrackToLibrary({
          title: result.title,
          artist: result.channel_title,
          source_platform: 'youtube',
          source_url: `https://www.youtube.com/watch?v=${result.video_id}`,
          source_id: result.video_id,
          thumbnail_url: result.thumbnail_url,
          duration_seconds: result.duration_seconds,
        });
        setTrackId(saved.id);
        setSaved(true);
        const newReaction = await setReaction(saved.id, type);
        updateReactionUI(type, newReaction);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      const newReaction = await setReaction(trackId, type);
      updateReactionUI(type, newReaction);
    } catch (e) {
      console.error(e);
    }
  };

  const updateReactionUI = (type: string, newReaction: string | null) => {
    // Reset deltas
    if (myReaction === 'like') setLikeDelta((d) => d - 1);
    if (myReaction === 'dislike') setDislikeDelta((d) => d - 1);
    if (newReaction === 'like') setLikeDelta((d) => d + 1);
    if (newReaction === 'dislike') setDislikeDelta((d) => d + 1);
    setMyReaction(newReaction);
  };

  return (
    <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl overflow-hidden transition hover:border-[#333]">
      <div className="flex items-center gap-4 p-4 group">
        {/* Thumbnail with play overlay */}
        <button
          onClick={handlePlay}
          disabled={extracting}
          className="w-28 h-20 rounded-lg bg-gradient-to-br from-[#FF4F2B]/30 to-[#E63D1A]/10 flex items-center justify-center shrink-0 relative overflow-hidden group/thumb"
        >
          {result.thumbnail_url ? (
            <img src={result.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : null}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition">
            {extracting ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : isThisPlaying && isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </div>
          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-mono text-white">
            {result.duration_display}
          </span>
          {isThisPlaying && (
            <div className="absolute top-1 left-1 bg-[#FF4F2B] text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider">
              {isPlaying ? 'Playing' : 'Paused'}
            </div>
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate mb-1">{result.title}</p>
          <div className="flex items-center gap-3 text-xs text-[#5A5A72]">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {result.channel_title}</span>
            <span>{formatViews(result.view_count)} views</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Like */}
          <button
            onClick={() => handleReaction('like')}
            className={`p-2 rounded-lg transition ${
              myReaction === 'like' ? 'bg-[#FF4F2B]/20 text-[#FF4F2B]' : 'text-[#5A5A72] hover:text-white hover:bg-[#16161F]'
            }`}
            title="Like"
          >
            <ThumbsUp className="w-4 h-4" />
            {likeDelta > 0 && <span className="text-[10px] ml-0.5">{likeDelta}</span>}
          </button>

          {/* Dislike */}
          <button
            onClick={() => handleReaction('dislike')}
            className={`p-2 rounded-lg transition ${
              myReaction === 'dislike' ? 'bg-red-500/20 text-red-400' : 'text-[#5A5A72] hover:text-white hover:bg-[#16161F]'
            }`}
            title="Dislike"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* Comment toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`p-2 rounded-lg transition ${
              showComments ? 'bg-[#FF4F2B]/20 text-[#FF4F2B]' : 'text-[#5A5A72] hover:text-white hover:bg-[#16161F]'
            }`}
            title="Comments"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          {/* Add to queue */}
          <button
            onClick={handlePlay}
            disabled={extracting}
            className="p-2 rounded-lg text-[#5A5A72] hover:text-white hover:bg-[#16161F] transition"
            title="Play audio"
          >
            <Play className="w-4 h-4" />
          </button>

          {/* Save to library */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              saved
                ? 'bg-green-500/20 text-green-400 cursor-default'
                : 'bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-40'
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              '✓ Saved'
            ) : (
              <><Plus className="w-3.5 h-3.5" /> Save</>
            )}
          </button>
        </div>
      </div>

      {/* Comments section */}
      {showComments && trackId && (
        <div className="px-4 pb-4">
          <CommentPanel trackId={trackId} onClose={() => setShowComments(false)} />
        </div>
      )}
      {showComments && !trackId && (
        <div className="px-4 pb-4">
          <div className="bg-[#16161F] border border-[#333] rounded-lg p-4 text-xs text-[#5A5A72] text-center">
            Save this track first to enable comments
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Search Page ────────────────────────────────────────────────────
export default function Search() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const data = await searchYouTube(query.trim());
      setResults(data.results);
    } catch (err) {
      console.error('Search failed:', err);
      setError((err as Error).message);
      setResults([]);
    }
    setSearching(false);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Search YouTube</h1>
      <p className="text-sm text-[#5A5A72] mb-6">Find music, live sessions, and audio content — listen without the video</p>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A72]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for music, artists, live sessions, Tiny Desk, KEXP..."
              className="w-full bg-[#0E0E14] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg pl-12 pr-4 py-3 text-sm outline-none transition placeholder:text-[#5A5A72]"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-40 px-6 py-3 rounded-lg text-sm font-semibold transition shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {searching ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF4F2B] animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A72]">Searching YouTube...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">Search failed</p>
          <p className="text-sm text-[#5A5A72]">{error}</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#5A5A72]">{results.length} results — audio only, no video</p>
          </div>
          <div className="space-y-3">
            {results.map((r) => (
              <ResultCard key={r.video_id} result={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <SearchIcon className="w-12 h-12 text-[#1E1E2A] mx-auto mb-4" />
          <p className="text-[#5A5A72]">
            {hasSearched ? 'No results found. Try different keywords.' : 'Search YouTube for audio content'}
          </p>
          {!hasSearched && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['Tiny Desk Concert', 'KEXP Live', 'Boiler Room', 'Acoustic Session', 'Colors Show'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); }}
                  className="bg-[#0E0E14] border border-[#1E1E2A] hover:border-[#FF4F2B] text-xs text-[#9898AA] hover:text-white px-3 py-1.5 rounded-full transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
