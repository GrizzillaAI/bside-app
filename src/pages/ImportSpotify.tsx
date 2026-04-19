// ImportSpotify — Browse connected Spotify playlists and import tracks into Mixd.
//
// Requires Spotify to be connected in Settings (OAuth flow with playlist scope).
// Uses the spotify-playlists edge function for playlist listing and item fetching.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Music, ChevronLeft, Loader2, Check, CheckCheck, Download,
  ListMusic, AlertCircle, RefreshCw, Settings, Lock,
} from 'lucide-react';
import {
  getMySpotifyConnection,
  getMySpotifyPlaylists,
  getSpotifyPlaylistItems,
  beginSpotifyOAuth,
  type SpotifyConnection,
  type SpotifyPlaylistSummary,
  type SpotifyPlaylistItem,
} from '../lib/spotify';
import { saveTrackToLibrary } from '../lib/api';

export default function ImportSpotify() {
  // ── State ──────────────────────────────────────────────────────────────
  const [connection, setConnection] = useState<SpotifyConnection | null>(null);
  const [checkingConn, setCheckingConn] = useState(true);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  // Drill-in to a playlist
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylistSummary | null>(null);
  const [items, setItems] = useState<SpotifyPlaylistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Import tracking
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [importAllRunning, setImportAllRunning] = useState(false);
  const [importAllDone, setImportAllDone] = useState(false);

  // ── Check Spotify connection ──────────────────────────────────────────
  useEffect(() => {
    getMySpotifyConnection()
      .then((conn) => setConnection(conn))
      .finally(() => setCheckingConn(false));
  }, []);

  // ── Fetch playlists once connected ────────────────────────────────────
  const fetchPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    setPlaylistError(null);
    setNeedsReconnect(false);
    try {
      const data = await getMySpotifyPlaylists();
      setPlaylists(data);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('reconnect')) {
        setNeedsReconnect(true);
      }
      setPlaylistError(msg);
    }
    setLoadingPlaylists(false);
  }, []);

  useEffect(() => {
    if (connection) fetchPlaylists();
  }, [connection, fetchPlaylists]);

  // ── Fetch items when a playlist is selected ───────────────────────────
  const openPlaylist = async (pl: SpotifyPlaylistSummary) => {
    setSelectedPlaylist(pl);
    setItems([]);
    setLoadingItems(true);
    setItemsError(null);
    setImportAllDone(false);
    try {
      const data = await getSpotifyPlaylistItems(pl.id);
      setItems(data);
    } catch (err) {
      setItemsError((err as Error).message);
    }
    setLoadingItems(false);
  };

  // ── Import a single track ────────────────────────────────────────────
  const importTrack = async (item: SpotifyPlaylistItem) => {
    if (imported.has(item.track_id) || importing.has(item.track_id)) return;
    setImporting((s) => new Set(s).add(item.track_id));
    try {
      await saveTrackToLibrary({
        title: item.title,
        artist: item.artist,
        source_platform: 'spotify',
        source_url: item.external_url,
        source_id: item.track_id,
        thumbnail_url: item.thumbnail_url,
        duration_seconds: item.duration_seconds,
      });
      setImported((s) => new Set(s).add(item.track_id));
    } catch (err) {
      console.error('Import failed:', err);
    }
    setImporting((s) => {
      const next = new Set(s);
      next.delete(item.track_id);
      return next;
    });
  };

  // ── Import all tracks ────────────────────────────────────────────────
  const importAll = async () => {
    if (importAllRunning) return;
    setImportAllRunning(true);
    for (const item of items) {
      if (!imported.has(item.track_id)) {
        await importTrack(item);
      }
    }
    setImportAllRunning(false);
    setImportAllDone(true);
  };

  const handleReconnect = () => {
    beginSpotifyOAuth('/app/import/spotify');
  };

  // ── Loading / not connected states ───────────────────────────────────
  if (checkingConn) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Music className="w-7 h-7 text-green-400" />
          Import from Spotify
        </h1>
        <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#5E5E7A] mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Spotify Not Connected</h2>
          <p className="text-sm text-[#5E5E7A] mb-6">
            Connect your Spotify account in Settings to browse and import your playlists.
          </p>
          <Link
            to="/app/settings"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg text-sm font-semibold transition text-white"
          >
            <Settings className="w-4 h-4" />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // ── Playlist items view (drill-in) ───────────────────────────────────
  if (selectedPlaylist) {
    const importedCount = items.filter((i) => imported.has(i.track_id)).length;
    return (
      <div>
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
              {selectedPlaylist.item_count} tracks
              {selectedPlaylist.owner && <span> · {selectedPlaylist.owner}</span>}
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
              const isImported = imported.has(item.track_id);
              const isImporting = importing.has(item.track_id);
              return (
                <div
                  key={item.track_id}
                  className="flex items-center gap-4 bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] rounded-lg px-4 py-3 transition group"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-[#1A1A28]">
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
                    <p className="text-xs text-[#5E5E7A] truncate">{item.artist}</p>
                    {item.album && (
                      <p className="text-xs text-[#5E5E7A]/60 truncate">{item.album}</p>
                    )}
                  </div>

                  {/* Duration */}
                  {item.duration_seconds > 0 && (
                    <span className="text-xs text-[#5E5E7A] shrink-0">
                      {Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}

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

  // ── Playlists grid view (default) ────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Music className="w-7 h-7 text-green-400" />
          Import from Spotify
        </h1>
        <div className="flex items-center gap-3">
          {connection.display_name && (
            <span className="text-xs text-[#5E5E7A] flex items-center gap-2">
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

      {/* Reconnect banner */}
      {needsReconnect && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
          <Lock className="w-8 h-8 text-yellow-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Playlist access needed</p>
            <p className="text-xs text-[#5E5E7A] mt-1">
              Your Spotify connection needs updated permissions to read playlists. Click Reconnect to grant access — your existing connection will be updated.
            </p>
          </div>
          <button
            onClick={handleReconnect}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shrink-0"
          >
            Reconnect
          </button>
        </div>
      )}

      {loadingPlaylists ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
          <p className="text-[#5E5E7A] text-sm">Loading your Spotify playlists...</p>
        </div>
      ) : playlistError && !needsReconnect ? (
        <div className="text-center py-20">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-sm mb-3">{playlistError}</p>
          <button onClick={fetchPlaylists} className="text-sm text-[#FF2D87] hover:underline">
            Try again
          </button>
        </div>
      ) : playlists.length === 0 && !needsReconnect ? (
        <div className="text-center py-20">
          <ListMusic className="w-12 h-12 text-[#1A1A28] mx-auto mb-4" />
          <p className="text-[#5E5E7A]">No playlists found on your Spotify account.</p>
        </div>
      ) : !needsReconnect && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => openPlaylist(pl)}
              className="bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] hover:border-green-500/30 rounded-xl overflow-hidden text-left transition group"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-[#1A1A28] relative overflow-hidden">
                {pl.thumbnail_url ? (
                  <img src={pl.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListMusic className="w-10 h-10 text-[#5E5E7A]" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-0.5 text-xs font-medium text-white">
                  {pl.item_count} tracks
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold truncate group-hover:text-green-400 transition">
                  {pl.title}
                </p>
                {pl.owner && (
                  <p className="text-xs text-[#5E5E7A] mt-0.5 truncate">by {pl.owner}</p>
                )}
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
