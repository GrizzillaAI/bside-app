// Mixd — Retro Cassette Deck Player
// Replaces the standard desktop player bar with an 80s-inspired tape deck UI.
// Transport buttons latch/unlatch with a synthesized mechanical click sound.
// Tape reels spin when playing. Embeds are rendered hidden inside the deck.

import { useRef, useCallback, useReducer, type ReactNode, type CSSProperties } from 'react';
import { usePlayer, formatTime } from '../lib/player';
import TrackReactions from './TrackReactions';

// ── Web Audio click sound ────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function clickSound() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const sr = ctx.sampleRate;
  const len = sr * 0.03; // 30ms
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = Math.exp(-i / (len * 0.08));
    const noise = (Math.random() * 2 - 1) * 0.6;
    const thump = Math.sin(2 * Math.PI * 120 * i / sr) * 1.2;
    d[i] = (noise + thump) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 200;
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  src.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
  src.start();
}

// ── Component ────────────────────────────────────────────────────────────
interface CassetteDeckProps {
  embedBlock: ReactNode;
}

type LatchedButton = 'play' | 'pause' | 'stop' | null;

export default function CassetteDeck({ embedBlock }: CassetteDeckProps) {
  const {
    currentTrack, isPlaying, currentTime, duration,
    seek, skipNext, skipPrev, pause, resume,
  } = usePlayer();

  // Derive latched state from isPlaying
  const latched: LatchedButton = isPlaying ? 'play' : currentTrack ? 'pause' : 'stop';

  // Momentary flash for skip/rew/ff
  const momentaryRef = useRef<string | null>(null);
  const momentaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const doMomentary = useCallback((id: string, action: () => void) => {
    clickSound();
    action();
    momentaryRef.current = id;
    forceUpdate();
    if (momentaryTimerRef.current) clearTimeout(momentaryTimerRef.current);
    momentaryTimerRef.current = setTimeout(() => {
      momentaryRef.current = null;
      forceUpdate();
    }, 180);
  }, []);

  const doPlay = useCallback(() => {
    clickSound();
    if (!isPlaying) {
      if (currentTrack) resume();
      else return; // nothing to play
    }
  }, [isPlaying, currentTrack, resume]);

  const doPause = useCallback(() => {
    clickSound();
    if (isPlaying) pause();
  }, [isPlaying, pause]);

  const doStop = useCallback(() => {
    clickSound();
    if (isPlaying) pause();
    seek(0);
  }, [isPlaying, pause, seek]);

  const doSkipBack = useCallback(() => {
    doMomentary('skb', skipPrev);
  }, [doMomentary, skipPrev]);

  const doSkipFwd = useCallback(() => {
    doMomentary('skf', skipNext);
  }, [doMomentary, skipNext]);

  const doRew = useCallback(() => {
    doMomentary('rew', () => seek(Math.max(0, currentTime - 10)));
  }, [doMomentary, seek, currentTime]);

  const doFF = useCallback(() => {
    doMomentary('ff', () => seek(Math.min(duration, currentTime + 10)));
  }, [doMomentary, seek, currentTime, duration]);

  // Progress percentage for tape "winding" visual
  const progress = duration > 0 ? currentTime / duration : 0;
  // Left reel gets bigger as tape plays; right reel gets smaller
  const leftReelSize = 42 + progress * 24; // 42px → 66px
  const rightReelSize = 66 - progress * 24; // 66px → 42px

  return (
    <div className="cassette-deck" style={styles.deck}>
      {/* Scanline overlay */}
      <div style={styles.scanlines} />
      {/* Top highlight */}
      <div style={styles.topHighlight} />

      {/* Brand bar */}
      <div style={styles.brand}>
        <div style={styles.brandLeft}>
          <span style={styles.brandName}>MIXD</span>
          <span style={styles.brandSub}>Stereo Cassette Deck</span>
        </div>
        <div style={{
          ...styles.powerDot,
          ...(isPlaying ? styles.powerDotOn : {}),
        }} />
      </div>

      {/* Tape well */}
      <div style={styles.well}>
        <div style={styles.cassette}>
          {/* Corner screws */}
          <div style={{ ...styles.screw, top: 7, left: 10 }} />
          <div style={{ ...styles.screw, top: 7, right: 10 }} />
          <div style={{ ...styles.screw, bottom: 7, left: 10 }} />
          <div style={{ ...styles.screw, bottom: 7, right: 10 }} />

          {/* Label strip */}
          <div style={styles.label}>
            <span style={styles.labelText}>MIXD</span>
            <div style={styles.labelLine} />
            <span style={styles.labelText}>Side A</span>
            <div style={styles.labelLine} />
            <span style={styles.labelText}>CrO₂ 90</span>
          </div>

          {/* Tape window oval */}
          <div style={styles.oval}>
            {/* Ribbon */}
            <div style={styles.ribbon} />

            {/* Guide posts */}
            <div style={{ ...styles.guidePost, left: 12 }} />
            <div style={{ ...styles.guidePost, left: 64 }} />
            <div style={{ ...styles.guidePost, right: 64 }} />
            <div style={{ ...styles.guidePost, right: 12 }} />

            {/* Left reel */}
            <div style={{ ...styles.reelContainer, marginRight: 'auto', marginLeft: 40 }}>
              <div style={{
                ...styles.reelSpin,
                animation: isPlaying ? 'cassette-spin 2.4s linear infinite' : 'none',
              }}>
                <div style={{
                  ...styles.wound,
                  width: leftReelSize,
                  height: leftReelSize,
                }} />
                <div style={styles.flange} />
                <Hub />
              </div>
            </div>

            {/* Right reel */}
            <div style={{ ...styles.reelContainer, marginLeft: 'auto', marginRight: 40 }}>
              <div style={{
                ...styles.reelSpin,
                animation: isPlaying ? 'cassette-spin 1.6s linear infinite' : 'none',
              }}>
                <div style={{
                  ...styles.wound,
                  width: rightReelSize,
                  height: rightReelSize,
                }} />
                <div style={styles.flange} />
                <Hub />
              </div>
            </div>

            {/* Head assembly */}
            <div style={styles.heads}>
              <div style={styles.capstan} />
              <div style={styles.roller} />
              <div style={styles.eraseHead} />
              <div style={styles.mainHead} />
              <div style={styles.mainHead} />
              <div style={styles.eraseHead} />
              <div style={styles.roller} />
              <div style={styles.capstan} />
            </div>
          </div>
        </div>

        {/* Now playing info */}
        <div style={styles.nowPlaying}>
          <span style={styles.npTitle}>{currentTrack?.title ?? 'No track loaded'}</span>
          {currentTrack && (
            <>
              <span style={styles.npDot} />
              <span style={styles.npArtist}>{currentTrack.artist}</span>
              <span style={styles.npDot} />
              <span style={styles.npTime}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <TrackReactions track={currentTrack} />
          </div>
        </div>
      </div>

      {/* ═══ TRANSPORT BUTTONS ═══ */}
      <div style={styles.transport}>
        <div style={styles.btnSlot}>

          {/* Stop */}
          <TransportBtn
            id="stop"
            isLatched={latched === 'stop'}
            onClick={doStop}
            label="Stop"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </TransportBtn>

          {/* Rec (decorative) */}
          <TransportBtn id="rec" isLatched={false} onClick={() => clickSound()} label="Rec">
            <div style={styles.recDot} />
          </TransportBtn>

          <div style={styles.slotDiv} />

          {/* Skip Back */}
          <TransportBtn id="skb" isLatched={false} isMomentary onClick={doSkipBack} label="⏮">
            <svg width="22" height="16" viewBox="0 0 28 18" fill="currentColor"><rect x="1" y="2" width="3.5" height="14" rx="1.2"/><polygon points="24,2 11,9 24,16"/></svg>
          </TransportBtn>

          {/* Rewind */}
          <TransportBtn id="rew" isLatched={false} isMomentary onClick={doRew} label="Rew">
            <svg width="22" height="16" viewBox="0 0 26 18" fill="currentColor"><polygon points="13,2 1,9 13,16"/><polygon points="25,2 13,9 25,16"/></svg>
          </TransportBtn>

          {/* Fast Forward */}
          <TransportBtn id="ff" isLatched={false} isMomentary onClick={doFF} label="FF">
            <svg width="22" height="16" viewBox="0 0 26 18" fill="currentColor"><polygon points="1,2 13,9 1,16"/><polygon points="13,2 25,9 13,16"/></svg>
          </TransportBtn>

          {/* Skip Forward */}
          <TransportBtn id="skf" isLatched={false} isMomentary onClick={doSkipFwd} label="⏭">
            <svg width="22" height="16" viewBox="0 0 28 18" fill="currentColor"><polygon points="4,2 17,9 4,16"/><rect x="23.5" y="2" width="3.5" height="14" rx="1.2"/></svg>
          </TransportBtn>

          <div style={styles.slotDiv} />

          {/* Play */}
          <TransportBtn
            id="play"
            isLatched={latched === 'play'}
            isWide
            onClick={() => { clickSound(); if (!isPlaying && currentTrack) resume(); }}
            label="Play"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>
          </TransportBtn>

          {/* Pause */}
          <TransportBtn
            id="pause"
            isLatched={latched === 'pause'}
            onClick={doPause}
            label="Pause"
          >
            <svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1.5"/><rect x="14" y="3" width="5" height="18" rx="1.5"/></svg>
          </TransportBtn>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottom}>
        <span style={styles.bottomText}>Dolby NR · HX Pro</span>
        <span style={styles.bottomText}>© 2026 Grizzilla</span>
      </div>

      {/* Hidden embed block — renders iframes for actual playback */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
        {embedBlock}
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes cassette-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Hub sub-component (the center of each reel) ──────────────────────────
function Hub() {
  const tks = [0, 60, 120, 180, 240, 300];
  return (
    <div style={styles.hub}>
      {tks.map((deg) => (
        <div key={deg} style={{
          position: 'absolute',
          width: 4,
          height: 10,
          background: 'linear-gradient(180deg,#4E4E6E,#3A3A5A)',
          borderRadius: 1.5,
          top: '50%',
          left: '50%',
          transformOrigin: 'center center',
          transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-5px)`,
        }} />
      ))}
      <div style={styles.hubDot} />
    </div>
  );
}

// ── Transport Button sub-component ───────────────────────────────────────
interface TransportBtnProps {
  id: string;
  isLatched: boolean;
  isWide?: boolean;
  isMomentary?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}

function TransportBtn({ isLatched, isWide, onClick, label, children }: TransportBtnProps) {
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.btn,
        ...(isWide ? { flex: 1.35 } : {}),
      }}
    >
      <div style={{
        ...styles.key,
        transform: isLatched ? 'translateY(12px)' : 'translateY(0)',
      }}>
        <div style={{
          ...styles.keyFace,
          ...(isLatched ? styles.keyFaceLatched : {}),
        }}>
          <div style={{ color: isLatched ? '#FF2D87' : '#555570', transition: 'color .06s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </div>
        </div>
        <div style={{
          ...styles.keyEdge,
          height: isLatched ? 4 : 16,
          bottom: isLatched ? -4 : -16,
          ...(isLatched ? styles.keyEdgeLatched : {}),
        }} />
      </div>
      <div style={{
        ...styles.btnLabel,
        color: isLatched ? '#FF2D87' : '#2A2A44',
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  deck: {
    width: '100%',
    position: 'relative',
    userSelect: 'none',
    background: 'linear-gradient(180deg,#161628 0%,#121224 15%,#0F0F20 40%,#0D0D1C 70%,#0B0B18 100%)',
    borderTop: '1px solid #2E2E48',
    flexShrink: 0,
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(255,255,255,.005) 1px,rgba(255,255,255,.005) 2px)',
    pointerEvents: 'none' as const,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg,transparent 3%,rgba(255,255,255,.1) 25%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.1) 75%,transparent 97%)',
    zIndex: 10,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 40px 0',
    position: 'relative',
    zIndex: 5,
  },
  brandLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 14,
  },
  brandName: {
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: 18,
    letterSpacing: '.35em',
    textTransform: 'uppercase' as const,
    color: '#EDEDF3',
  },
  brandSub: {
    fontSize: 9,
    color: '#4A4A66',
    letterSpacing: '.08em',
  },
  powerDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#1A1A30',
    border: '1px solid #333',
    transition: 'all .3s',
  },
  powerDotOn: {
    background: '#00E6A0',
    boxShadow: '0 0 10px rgba(0,230,160,.5)',
    borderColor: '#00E6A0',
  },

  // Tape well
  well: {
    margin: '14px 40px 0',
    background: 'linear-gradient(180deg,#07071A 0%,#050516 100%)',
    border: '2px solid #2A2A46',
    borderRadius: 8,
    padding: '16px 20px 14px',
    boxShadow: 'inset 0 4px 16px rgba(0,0,0,.6),inset 0 -2px 8px rgba(0,0,0,.3)',
    position: 'relative',
    zIndex: 5,
  },

  // Cassette body
  cassette: {
    width: '100%',
    height: 150,
    position: 'relative',
    background: 'linear-gradient(180deg,#1C1C36 0%,#161632 40%,#12122A 100%)',
    border: '1px solid #2A2A48',
    borderRadius: '10px 10px 6px 6px',
    boxShadow: '0 3px 8px rgba(0,0,0,.35)',
  },
  screw: {
    position: 'absolute' as const,
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 38% 32%,#222240,#0E0E22)',
    border: '1px solid #2E2E4A',
    zIndex: 4,
  },
  label: {
    position: 'absolute' as const,
    top: 7,
    left: 24,
    right: 24,
    height: 34,
    background: 'linear-gradient(180deg,rgba(255,45,135,.08) 0%,rgba(255,45,135,.03) 100%)',
    border: '1px solid rgba(255,45,135,.12)',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    gap: 8,
    zIndex: 3,
  },
  labelText: {
    fontSize: 7.5,
    fontFamily: '"Archivo Black", sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '.16em',
    color: 'rgba(255,45,135,.5)',
    whiteSpace: 'nowrap' as const,
  },
  labelLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,45,135,.12)',
  },

  // Oval window
  oval: {
    position: 'absolute' as const,
    top: 46,
    left: 28,
    right: 28,
    bottom: 10,
    background: 'rgba(3,3,14,.7)',
    border: '1px solid rgba(255,45,135,.05)',
    borderRadius: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute' as const,
    top: '50%',
    left: 22,
    right: 22,
    height: 10,
    transform: 'translateY(-50%)',
    zIndex: 0,
    background: 'rgba(255,45,135,.04)',
    borderTop: '1px solid rgba(255,45,135,.09)',
    borderBottom: '1px solid rgba(255,45,135,.05)',
  },
  guidePost: {
    position: 'absolute' as const,
    width: 5,
    height: 18,
    background: 'linear-gradient(90deg,#38385A,#4A4A6E,#38385A)',
    border: '1px solid #4A4A6E',
    borderRadius: 2,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,.4)',
  },

  // Reels
  reelContainer: {
    position: 'relative' as const,
    zIndex: 1,
  },
  reelSpin: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wound: {
    position: 'absolute' as const,
    borderRadius: '50%',
    background: 'repeating-radial-gradient(circle,rgba(255,45,135,.02) 0px,rgba(255,45,135,.05) 1px,rgba(255,45,135,.02) 2.5px)',
    border: '1px solid rgba(255,45,135,.07)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
  },
  flange: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(60,60,96,.45)',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)',
  },
  hub: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 38% 32%,#2E2E50,#1A1A36)',
    border: '2px solid #3E3E5E',
    position: 'relative' as const,
    zIndex: 2,
    boxShadow: '0 1px 4px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#5E5E80,#4A4A6A)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)',
    zIndex: 3,
  },

  // Head assembly
  heads: {
    position: 'absolute' as const,
    bottom: -4,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 5,
    zIndex: 3,
  },
  capstan: {
    width: 4,
    height: 22,
    background: 'linear-gradient(90deg,#4A4A6E,#6A6A8E,#4A4A6E)',
    borderRadius: 2,
    boxShadow: '0 0 3px rgba(0,0,0,.4)',
  },
  roller: {
    width: 13,
    height: 20,
    background: 'linear-gradient(90deg,#1A1A30,#252542,#1A1A30)',
    border: '1px solid #333',
    borderRadius: 5,
  },
  mainHead: {
    width: 16,
    height: 14,
    background: 'linear-gradient(180deg,#4A4A6E,#38385A)',
    border: '1px solid #5A5A7E',
    borderRadius: '3px 3px 0 0',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
  },
  eraseHead: {
    width: 12,
    height: 12,
    background: 'linear-gradient(180deg,#38385A,#2A2A48)',
    border: '1px solid #4A4A6E',
    borderRadius: '2px 2px 0 0',
  },

  // Now playing
  nowPlaying: {
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  npTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#EDEDF3',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '-.01em',
  },
  npDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#5E5E7A',
    flexShrink: 0,
  },
  npArtist: {
    fontSize: 13,
    color: '#A0A0B8',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  npTime: {
    fontSize: 11,
    color: '#5E5E7A',
    fontFamily: '"JetBrains Mono", monospace',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // Transport
  transport: {
    margin: '0 40px',
    padding: '16px 0 0',
    position: 'relative',
    zIndex: 5,
  },
  btnSlot: {
    position: 'relative' as const,
    background: '#040410',
    border: '2px solid #1A1A2E',
    borderRadius: 6,
    padding: 0,
    boxShadow: 'inset 0 6px 16px rgba(0,0,0,.7),inset 0 -2px 6px rgba(0,0,0,.4),inset 2px 0 8px rgba(0,0,0,.4),inset -2px 0 8px rgba(0,0,0,.4),0 1px 0 rgba(255,255,255,.03)',
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  slotDiv: {
    width: 3,
    flexShrink: 0,
    background: 'linear-gradient(180deg,#0C0C1A 0%,#060612 50%,#0C0C1A 100%)',
    borderLeft: '1px solid #1A1A30',
    borderRight: '1px solid #1A1A30',
  },
  btn: {
    position: 'relative' as const,
    cursor: 'pointer',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: 0,
    height: 92,
  },
  key: {
    position: 'relative' as const,
    width: 'calc(100% - 4px)',
    margin: '2px auto 0',
    height: 52,
    transition: 'transform .04s linear',
  },
  keyFace: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(180deg,#1E1E32 0%,#1A1A2E 4%,#161628 12%,#141424 50%,#121220 88%,#10101E 96%,#0E0E1C 100%)',
    borderRadius: '3px 3px 2px 2px',
    border: '1px solid #222238',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(0,0,0,.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  keyFaceLatched: {
    background: 'linear-gradient(180deg,#1A1A2E 0%,#161628 10%,#141424 50%,#121220 90%,#10101E 100%)',
    borderColor: 'rgba(255,45,135,.15)',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,45,135,.04),0 0 16px rgba(255,45,135,.06)',
  },
  keyEdge: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    background: 'linear-gradient(180deg,#0E0E1E 0%,#0C0C1A 20%,#0A0A16 50%,#080814 80%,#060610 100%)',
    border: '1px solid #181830',
    borderTop: 'none',
    borderRadius: '0 0 2px 2px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.02),0 3px 8px rgba(0,0,0,.6)',
    zIndex: 1,
  },
  keyEdgeLatched: {
    background: 'linear-gradient(180deg,#0A0A18 0%,#080814 100%)',
  },
  btnLabel: {
    position: 'absolute' as const,
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontSize: 7.5,
    fontFamily: '"Archivo Black", sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '.1em',
    transition: 'color .06s',
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  recDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#333350',
    border: '1.5px solid #444466',
  },
  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 40px 14px',
    position: 'relative',
    zIndex: 5,
  },
  bottomText: {
    fontSize: 8,
    color: '#1E1E38',
    letterSpacing: '.06em',
  },
};
