// TrackReactions — Thumbs up / down buttons for the player bar.
//
// Shows two small thumb icons next to the track info. Tapping the same
// reaction toggles it off; tapping the other switches. The component
// fetches the user's existing reaction when the track changes and
// optimistically updates on click.

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { ensureTrackInDb, getMyReaction, setReaction } from '../lib/api';
import type { PlayerTrack } from '../lib/player';

interface TrackReactionsProps {
  track: PlayerTrack | null;
}

export default function TrackReactions({ track }: TrackReactionsProps) {
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null);
  const [trackDbId, setTrackDbId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // When the current track changes, look up the DB id and existing reaction
  useEffect(() => {
    if (!track) {
      setMyReaction(null);
      setTrackDbId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // If the track already has a DB id, use it; otherwise upsert
        let dbId = track.id ?? null;
        if (!dbId) {
          dbId = await ensureTrackInDb({
            title: track.title,
            artist: track.artist,
            source_platform: track.source_platform,
            source_url: track.source_url,
            source_id: track.source_id,
            thumbnail_url: track.thumbnail_url,
            duration_seconds: track.duration_seconds || null,
          });
        }
        if (cancelled) return;
        setTrackDbId(dbId);

        const existing = await getMyReaction(dbId);
        if (cancelled) return;
        setMyReaction(existing);
      } catch (e) {
        console.warn('Failed to load reaction:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [track?.source_platform, track?.source_id]);

  const handleReaction = useCallback(async (type: 'like' | 'dislike') => {
    if (!trackDbId || busy) return;
    setBusy(true);

    // Optimistic update
    const prev = myReaction;
    setMyReaction(prev === type ? null : type);

    try {
      const result = await setReaction(trackDbId, type);
      setMyReaction(result);
    } catch (e) {
      console.warn('Reaction failed:', e);
      setMyReaction(prev); // rollback
    }
    setBusy(false);
  }, [trackDbId, myReaction, busy]);

  if (!track) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => handleReaction('like')}
        disabled={busy}
        className={`p-1.5 rounded-full transition ${
          myReaction === 'like'
            ? 'text-[#DAFF00] bg-[#DAFF00]/15'
            : 'text-[#5E5E7A] hover:text-white'
        }`}
        title="Thumbs up"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleReaction('dislike')}
        disabled={busy}
        className={`p-1.5 rounded-full transition ${
          myReaction === 'dislike'
            ? 'text-[#FF2D87] bg-[#FF2D87]/15'
            : 'text-[#5E5E7A] hover:text-white'
        }`}
        title="Thumbs down"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}
