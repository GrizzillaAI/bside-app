// ImportYouTube — Browse connected YouTube playlists and import tracks into Mixd.
//
// Requires YouTube to be connected in Settings (OAuth flow).
// Uses the youtube-playlists edge function for playlist listing and item fetching.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Youtube, ChevronLeft, Loader2, Check, CheckCheck, Download,
  ListMusic, Music, AlertCircle, RefreshCw, Settings,
} from 'lucide-react';
import {
  getMyYouTubeConnection,
  getMyYouTubePlaylists,
  getYouTubePlaylistItems,
  type YouTubeConnection,
  type YouTubePlaylistSummary,
  type YouTubePlaylistItem,
} from '../lib/youtube';
import { saveTrackToLibrary } from '../lib/api';

export default function ImportYouTube() {
  // ── State ──────────────────────────────────────────────────────────────
  const [connection, setConnection] = useState<YouTubeConnection | null>(null);
  const [checkingConn, setCheckingConn] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylistSummary[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // Drill-in to a playlist
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylistSummary | null>(null);
  const [items, setItems] = useState<YouTubePlaylistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Import tracking: set of video_ids that have been imported this session
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [importAllRunning, setImportAllRunning] = useState(false);
  const [importAllDone, setImportAllDone] = useState(false);

  // ── Check YouTube connection ───────────────────────────────────────────
  useEffect(() => {
    getMyYouTubeConnection()
      .then((conn) => setConnection(conn))
      .finally(() => setCheckingConn(false));
  }, []);

  // ── Fetch playlists once connected ─────────────────────────────────────
  const fetchPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    setPlaylistError(null);
    try {
      const data = await getMyYouTubePlaylists();
      setPlaylists(data);
    } catch (err) {
      setPlaylistError((err as Error).message);
    }
    setLoadingPlaylists(false);
  }, []);

  useEffect(() => {
    if (connection) fetchPlaylists();
  }, [connection, fetchPlaylists]);

  // ── Fetch items when a playlist is selected ────────────────────────────
  const openPlaylist = async (pl: YouTubePlaylistSummary) => {
    setSelectedPlaylist(pl);
    setItems([]);
    setLoadingItems(true);
    setItemsError(null);
    setImportAllDone(false);
    try {
      const data = await getYouTubePlaylistItems(pl.id);
      setItems(data);
    } catch (err) {
      setItemsError((err as Error).message);
    }
    setLoadingItems(false);
  };

  // ── Import a single track ─────────────────────────────────────────────
  const importTrack = async (item: YouTubePlaylistItem) => {
    if (imported.has(item.video_id) || importing.has(item.video_id)) return;
    setImporting((s) => new Set(s).add(item.video_id));
    try {
      await saveTrackToLibrary({
        title: item.title,
        artist: item.channel_title,
        source_platform: 'youtube',
        source_url: `https://www.youtube.com/watch?v=${item.video_id}`,
        source_id: item.video_id,
        thumbnail_url: item.thumbnail_url,
        duration_seconds: null,
      });
      setImported((s) => new Set(s).add(item.video_id));
    } catch (err) {
      console.error('Import failed:', err);
    }
    setImporting((s) => {
      const next = new Set(s);
      next.delete(item.video_id);
      return next;
    });
  };

  // ── Import all tracks in the current playlist ─────────────────────────
  const importAll = async () => {
    if (importAllRunning) return;
    setImportAllRunning(true);
    for (const item of items) {
      if (!imported.has(item.video_id)) {
        await importTrack(item);
      }
    }
    setImportAllRunning(false);
    setImportAllDone(true);
  };

  // ── Loading / not connected states ────────────────────────────────────
  if (checkingConn) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Youtube className="w-7 h-7 text-red-500" />
          Import from YouTube
        </h1>
        <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#5E5E7A] mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">YouTube Not Connected</h2>
          <p className="text-sm text-[#5E5E7A] mb-6">
            Connect your YouTube account in Settings to browse and import your playlists.
          </p>
          <Link
            to="/app/settings"
            className="inline-flex items-center gap-2 bg-[#FF2D87] hover:bg-[#E01570] px-6 py-3 rounded-lg text-sm font-semibold transition"
          >
            <Settings className="w-4 h-4" />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // ── Playlist items view (drill-in) ────────────────────────────────────
  if (selectedPlaylist) {
    const importedCount = items.filter((i) => imported.has(i.video_id)).length;
    return (
      <div className="max-w-4xl">
        {/* Header with back button */}
        <button
          onClick={() => { setSelectedPlaylist(null); setItems([]); setImportAllDone(false); }}
          className="flex items-center gap-2 text-sm text-[#5E5E7A] hover:text-[#FF2D87] transition mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to playlists
        </button>

        <div className="flex items-start gap-4 mb-6">
          {selectedPlaylist.thumbnail_url ? (
            <img
              src={selectedPlaylist.thumbnail_url}
              alt=""
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-[#1A1A28] flex items-center justify-center shrink-0">
              <ListMusic className="w-8 h-8 text-[#5E5E7A]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">{selectedPlaylist.title}</h1>
            <p className="text-sm text-[#5E5E7A]">
              {selectedPlaylist.item_count} videos
              {importedCount > 0 && (
                <span className="text-[#FF2D87] ml-2">
                  {importedCount} imported
                </span>
              )}
            </p>
            {selectedPlaylist.description && (
              <p className="text-xs text-[#5E5E7A] mt-1 line-clamp-2">{selectedPlaylist.description}</p>
            )}
          </div>

          {/* Import all button */}
          <button
            onClick={importAll}
            disabled={importAllRunning || importAllDone || items.length === 0}
            className="flex items-center gap-2 bg-[#FF2D87] hover:bg-[#E01570] disabled:opacity-40 px-5 py-2.5 rounded-lg text-sm font-semibold transition shrink-0"
          >
            {importAllRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
            ) : importAllDone ? (
              <><CheckCheck className="w-4 h-4" /> All Imported</>
            ) : (
              <><Download className="w-4 h-4" /> Import All</>
            )}
          </button>
        </div>

        {/* Items list */}
        {loadingItems ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
            <p className="text-[#5E5E7A] text-sm">Loading tracks...</p>
          </div>
        ) : itemsError ? (
          <div className="text-center py-16">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm mb-3">{itemsError}</p>
            <button onClick={() => openPlaylist(selectedPlaylist)} className="text-sm text-[#FF2D87] hover:underline">
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-10 h-10 text-[#1A1A28] mx-auto mb-4" />
            <p className="text-[#5E5E7A] text-sm">This playlist is empty.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isImported = imported.has(item.video_id);
              const isImporting = importing.has(item.video_id);
              return (
                <div
                  key={item.video_id}
                  className="flex items-center gap-4 bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] rounded-lg px-4 py-3 transition group"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-10 rounded overflow-hidden shrink-0 bg-[#1A1A28]">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-[#5E5E7A]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[#5E5E7A] truncate">{item.channel_title}</p>
                  </div>

                  {/* Import button */}
                  <button
                    onClick={() => importTrack(item)}
                    disabled={isImported || isImporting}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                      isImported
                        ? 'bg-green-500/10 text-green-400 cursor-default'
                        : isImporting
                        ? 'bg-[#1A1A28] text-[#5E5E7A]'
                        : 'bg-[#FF2D87]/10 text-[#FF2D87] hover:bg-[#FF2D87] hover:text-white'
                    }`}
                  >
                    {isImported ? (
                      <><Check className="w-3.5 h-3.5" /> Added</>
                    ) : isImporting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Import</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Playlists grid view (default) ─────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Youtube className="w-7 h-7 text-red-500" />
          Import from YouTube
        </h1>
        <div className="flex items-center gap-3">
          {connection.display_name && (
            <span className="text-xs text-[#5E5E7A] flex items-center gap-2">
              {connection.avatar_url && (
                <img src={connection.avatar_url} alt="" className="w-5 h-5 rounded-full" />
              )}
              {connection.display_name}
            </span>
          )}
          <button
            onClick={fetchPlaylists}
            disabled={loadingPlaylists}
            className="text-[#5E5E7A] hover:text-[#FF2D87] transition p-2"
            title="Refresh playlists"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPlaylists ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadingPlaylists ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
          <p className="text-[#5E5E7A] text-sm">Loading your YouTube playlists...</p>
        </div>
      ) : playlistError ? (
        <div className="text-center py-20">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-sm mb-3">{playlistError}</p>
          <button onClick={fetchPlaylists} className="text-sm text-[#FF2D87] hover:underline">
            Try again
          </button>
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20">
          <ListMusic className="w-12 h-12 text-[#1A1A28] mx-auto mb-4" />
          <p className="text-[#5E5E7A]">No playlists found on your YouTube account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => openPlaylist(pl)}
              className="bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] hover:border-[#FF2D87]/30 rounded-xl overflow-hidden text-left transition group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#1A1A28] relative overflow-hidden">
                {pl.thumbnail_url ? (
                  <img src={pl.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListMusic className="w-10 h-10 text-[#5E5E7A]" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-0.5 text-xs font-medium text-white">
                  {pl.item_count} videos
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold truncate group-hover:text-[#FF2D87] transition">
                  {pl.title}
                </p>
                {pl.description && (
                  <p className="text-xs text-[#5E5E7A] mt-1 line-clamp-2">{pl.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
