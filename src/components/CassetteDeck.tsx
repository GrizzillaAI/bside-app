// Mixd — Retro Cassette Deck Player
// Replaces the standard player bar with an 80s-inspired tape deck UI.
// Transport buttons latch/unlatch with a synthesized mechanical click sound.
// Tape reels spin when playing. Responsive: full deck on desktop, compact on mobile.

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
  const len = sr * 0.03;
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
  compact?: boolean; // mobile compact layout
}

type LatchedButton = 'play' | 'pause' | 'stop' | null;

export default function CassetteDeck({ embedBlock, compact = false }: CassetteDeckProps) {
  const {
    currentTrack, isPlaying, currentTime, duration,
    seek, skipNext, skipPrev, pause, resume,
  } = usePlayer();

  const latched: LatchedButton = isPlaying ? 'play' : currentTrack ? 'pause' : 'stop';

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

  // Progress for tape winding visual
  const progress = duration > 0 ? currentTime / duration : 0;

  // Sizing based on compact vs full
  // Real cassette: 102mm × 64mm = ratio 1.594:1
  const CASSETTE_RATIO = '102 / 64';
  const pad = compact ? 12 : 40;
  const btnH = compact ? 62 : 92;
  const keyH = compact ? 36 : 52;
  const edgeH = compact ? 10 : 16;
  const latchOffset = compact ? 8 : 12;
  const latchEdge = compact ? 3 : 4;

  return (
    <div className="cassette-deck" style={{
      width: '100%',
      position: 'relative',
      userSelect: 'none',
      background: 'linear-gradient(180deg,#161628 0%,#121224 15%,#0F0F20 40%,#0D0D1C 70%,#0B0B18 100%)',
      borderTop: '1px solid #2E2E48',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Scanline overlay */}
      <div style={s.scanlines} />
      <div style={s.topHighlight} />

      {/* Brand bar — desktop only */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `12px ${pad}px 0`, position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, letterSpacing: '.35em', textTransform: 'uppercase' as const, color: '#EDEDF3' }}>MIXD</span>
            <span style={{ fontSize: 9, color: '#4A4A66', letterSpacing: '.08em' }}>Stereo Cassette Deck</span>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isPlaying ? '#00E6A0' : '#1A1A30',
            border: `1px solid ${isPlaying ? '#00E6A0' : '#333'}`,
            boxShadow: isPlaying ? '0 0 10px rgba(0,230,160,.5)' : 'none',
            transition: 'all .3s',
          }} />
        </div>
      )}

      {/* Tape well */}
      <div style={{
        margin: `${compact ? 6 : 14}px ${pad}px 0`,
        background: 'linear-gradient(180deg,#07071A 0%,#050516 100%)',
        border: '2px solid #2A2A46',
        borderRadius: compact ? 6 : 8,
        padding: compact ? '10px 12px 8px' : '16px 20px 14px',
        boxShadow: 'inset 0 4px 16px rgba(0,0,0,.6),inset 0 -2px 8px rgba(0,0,0,.3)',
        position: 'relative',
        zIndex: 5,
      }}>
        {/* Cassette body — real cassette ratio 102mm × 64mm */}
        <div style={{
          width: '100%',
          maxWidth: compact ? 340 : 520,
          aspectRatio: CASSETTE_RATIO,
          margin: '0 auto',
          position: 'relative',
          background: 'linear-gradient(180deg,#1C1C36 0%,#161632 40%,#12122A 100%)',
          border: '1px solid #2A2A48',
          borderRadius: compact ? '6px 6px 4px 4px' : '10px 10px 6px 6px',
          boxShadow: '0 3px 8px rgba(0,0,0,.35)',
        }}>
          {/* Corner screws */}
          {!compact && (
            <>
              <div style={{ ...s.screw, top: '5%', left: '2.5%' }} />
              <div style={{ ...s.screw, top: '5%', right: '2.5%' }} />
              <div style={{ ...s.screw, bottom: '5%', left: '2.5%' }} />
              <div style={{ ...s.screw, bottom: '5%', right: '2.5%' }} />
            </>
          )}

          {/* Label strip — top 22% of cassette */}
          <div style={{
            position: 'absolute', top: '5%', left: '6%', right: '6%', height: '22%',
            background: 'linear-gradient(180deg,rgba(255,45,135,.08) 0%,rgba(255,45,135,.03) 100%)',
            border: '1px solid rgba(255,45,135,.12)', borderRadius: 4,
            display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, zIndex: 3,
          }}>
            <span style={s.labelText}>MIXD</span>
            <div style={s.labelLine} />
            <span style={s.labelText}>Side A</span>
            {!compact && (
              <>
                <div style={s.labelLine} />
                <span style={s.labelText}>CrO₂ 90</span>
              </>
            )}
          </div>

          {/* Tape window oval — bottom 60% of cassette */}
          <div style={{
            position: 'absolute', top: '30%', left: '7%', right: '7%', bottom: '6%',
            background: 'rgba(3,3,14,.7)', border: '1px solid rgba(255,45,135,.05)',
            borderRadius: '40%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {/* Ribbon */}
            <div style={{ position: 'absolute', top: '50%', left: '8%', right: '8%', height: '14%', transform: 'translateY(-50%)', zIndex: 0, background: 'rgba(255,45,135,.04)', borderTop: '1px solid rgba(255,45,135,.09)', borderBottom: '1px solid rgba(255,45,135,.05)' }} />

            {/* Guide posts — desktop only */}
            {!compact && (
              <>
                <div style={{ ...s.guidePost, left: '4%' }} />
                <div style={{ ...s.guidePost, left: '22%' }} />
                <div style={{ ...s.guidePost, right: '22%' }} />
                <div style={{ ...s.guidePost, right: '4%' }} />
              </>
            )}

            {/* Left reel — sized relative to oval height */}
            <div style={{ position: 'relative', zIndex: 1, marginRight: 'auto', marginLeft: '12%' }}>
              <div className="cassette-reel" style={{
                width: compact ? 44 : 68, height: compact ? 44 : 68, borderRadius: '50%',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: isPlaying ? 'cassette-spin 2.4s linear infinite' : 'none',
              }}>
                <div style={{ position: 'absolute', borderRadius: '50%', background: 'repeating-radial-gradient(circle,rgba(255,45,135,.02) 0px,rgba(255,45,135,.05) 1px,rgba(255,45,135,.02) 2.5px)', border: '1px solid rgba(255,45,135,.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: (compact ? 28 : 42) + progress * (compact ? 14 : 24), height: (compact ? 28 : 42) + progress * (compact ? 14 : 24) }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(60,60,96,.45)', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }} />
                <Hub size={compact ? 18 : 28} />
              </div>
            </div>

            {/* Right reel */}
            <div style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', marginRight: '12%' }}>
              <div className="cassette-reel" style={{
                width: compact ? 44 : 68, height: compact ? 44 : 68, borderRadius: '50%',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: isPlaying ? 'cassette-spin 1.6s linear infinite' : 'none',
              }}>
                <div style={{ position: 'absolute', borderRadius: '50%', background: 'repeating-radial-gradient(circle,rgba(255,45,135,.02) 0px,rgba(255,45,135,.05) 1px,rgba(255,45,135,.02) 2.5px)', border: '1px solid rgba(255,45,135,.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: (compact ? 42 : 66) - progress * (compact ? 14 : 24), height: (compact ? 42 : 66) - progress * (compact ? 14 : 24) }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(60,60,96,.45)', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }} />
                <Hub size={compact ? 18 : 28} />
              </div>
            </div>

            {/* Head assembly — desktop only */}
            {!compact && (
              <div style={s.heads}>
                <div style={s.capstan} />
                <div style={s.roller} />
                <div style={s.eraseHead} />
                <div style={s.mainHead} />
                <div style={s.mainHead} />
                <div style={s.eraseHead} />
                <div style={s.roller} />
                <div style={s.capstan} />
              </div>
            )}
          </div>
        </div>

        {/* Now playing info */}
        <div style={{ marginTop: compact ? 6 : 10, display: 'flex', alignItems: 'center', gap: compact ? 8 : 12, minWidth: 0 }}>
          <span style={{ fontSize: compact ? 12 : 15, fontWeight: 700, color: '#EDEDF3', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em', minWidth: 0 }}>
            {currentTrack?.title ?? 'No track loaded'}
          </span>
          {currentTrack && (
            <>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#5E5E7A', flexShrink: 0 }} />
              <span style={{ fontSize: compact ? 11 : 13, color: '#A0A0B8', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {currentTrack.artist}
              </span>
              {!compact && (
                <>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#5E5E7A', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#5E5E7A', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </>
              )}
            </>
          )}
          {!compact && (
            <div style={{ marginLeft: 'auto' }}>
              <TrackReactions track={currentTrack} />
            </div>
          )}
        </div>
      </div>

      {/* ═══ TRANSPORT BUTTONS ═══ */}
      <div style={{ margin: `0 ${pad}px`, padding: `${compact ? 8 : 16}px 0 0`, position: 'relative', zIndex: 5 }}>
        <div style={s.btnSlot}>

          {/* On mobile, hide Stop + Rec to save space */}
          {!compact && (
            <>
              <TransportBtn id="stop" isLatched={latched === 'stop'} onClick={doStop} label="Stop" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </TransportBtn>
              <TransportBtn id="rec" isLatched={false} onClick={() => clickSound()} label="Rec" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#333350', border: '1.5px solid #444466' }} />
              </TransportBtn>
              <div style={s.slotDiv} />
            </>
          )}

          <TransportBtn id="skb" isLatched={false} isMomentary onClick={doSkipBack} label="⏮" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 16 : 22} height={compact ? 12 : 16} viewBox="0 0 28 18" fill="currentColor"><rect x="1" y="2" width="3.5" height="14" rx="1.2"/><polygon points="24,2 11,9 24,16"/></svg>
          </TransportBtn>

          <TransportBtn id="rew" isLatched={false} isMomentary onClick={doRew} label="Rew" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 16 : 22} height={compact ? 12 : 16} viewBox="0 0 26 18" fill="currentColor"><polygon points="13,2 1,9 13,16"/><polygon points="25,2 13,9 25,16"/></svg>
          </TransportBtn>

          <TransportBtn id="ff" isLatched={false} isMomentary onClick={doFF} label="FF" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 16 : 22} height={compact ? 12 : 16} viewBox="0 0 26 18" fill="currentColor"><polygon points="1,2 13,9 1,16"/><polygon points="13,2 25,9 13,16"/></svg>
          </TransportBtn>

          <TransportBtn id="skf" isLatched={false} isMomentary onClick={doSkipFwd} label="⏭" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 16 : 22} height={compact ? 12 : 16} viewBox="0 0 28 18" fill="currentColor"><polygon points="4,2 17,9 4,16"/><rect x="23.5" y="2" width="3.5" height="14" rx="1.2"/></svg>
          </TransportBtn>

          <div style={s.slotDiv} />

          <TransportBtn id="play" isLatched={latched === 'play'} isWide onClick={() => { clickSound(); if (!isPlaying && currentTrack) resume(); }} label="Play" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 14 : 20} height={compact ? 14 : 20} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>
          </TransportBtn>

          <TransportBtn id="pause" isLatched={latched === 'pause'} onClick={doPause} label="Pause" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 10 : 14} height={compact ? 12 : 16} viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1.5"/><rect x="14" y="3" width="5" height="18" rx="1.5"/></svg>
          </TransportBtn>

        </div>
      </div>

      {/* Bottom bar — desktop only */}
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `14px ${pad}px 14px`, position: 'relative', zIndex: 5 }}>
          <span style={{ fontSize: 8, color: '#1E1E38', letterSpacing: '.06em' }}>Dolby NR · HX Pro</span>
          <span style={{ fontSize: 8, color: '#1E1E38', letterSpacing: '.06em' }}>© 2026 Grizzilla</span>
        </div>
      )}

      {/* Compact bottom pad */}
      {compact && <div style={{ height: 8 }} />}

      {/* Hidden embed block — iframes for actual playback */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
        {embedBlock}
      </div>

      <style>{`
        @keyframes cassette-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Hub sub-component ────────────────────────────────────────────────────
function Hub({ size = 28 }: { size?: number }) {
  const tks = [0, 60, 120, 180, 240, 300];
  const tkH = size * 0.36;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 32%,#2E2E50,#1A1A36)',
      border: '2px solid #3E3E5E',
      position: 'relative', zIndex: 2,
      boxShadow: '0 1px 4px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {tks.map((deg) => (
        <div key={deg} style={{
          position: 'absolute', width: 4, height: tkH,
          background: 'linear-gradient(180deg,#4E4E6E,#3A3A5A)',
          borderRadius: 1.5, top: '50%', left: '50%',
          transformOrigin: 'center center',
          transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-${tkH / 2}px)`,
        }} />
      ))}
      <div style={{ width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: 'linear-gradient(135deg,#5E5E80,#4A4A6A)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)', zIndex: 3 }} />
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
  btnH: number;
  keyH: number;
  edgeH: number;
  latchOffset: number;
  latchEdge: number;
  small?: boolean;
}

function TransportBtn({ isLatched, isWide, onClick, label, children, btnH, keyH, edgeH, latchOffset, latchEdge, small }: TransportBtnProps) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', cursor: 'pointer', flex: isWide ? 1.35 : 1,
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
        padding: 0, height: btnH,
      }}
    >
      <div style={{
        position: 'relative', width: 'calc(100% - 4px)', margin: '2px auto 0', height: keyH,
        transition: 'transform .04s linear',
        transform: isLatched ? `translateY(${latchOffset}px)` : 'translateY(0)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: isLatched
            ? 'linear-gradient(180deg,#1A1A2E 0%,#161628 10%,#141424 50%,#121220 90%,#10101E 100%)'
            : 'linear-gradient(180deg,#1E1E32 0%,#1A1A2E 4%,#161628 12%,#141424 50%,#121220 88%,#10101E 96%,#0E0E1C 100%)',
          borderRadius: '3px 3px 2px 2px',
          border: `1px solid ${isLatched ? 'rgba(255,45,135,.15)' : '#222238'}`,
          boxShadow: isLatched
            ? 'inset 0 2px 6px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,45,135,.04),0 0 16px rgba(255,45,135,.06)'
            : 'inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>
          <div style={{ color: isLatched ? '#FF2D87' : '#555570', transition: 'color .06s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </div>
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0,
          height: isLatched ? latchEdge : edgeH,
          bottom: isLatched ? -latchEdge : -edgeH,
          background: isLatched
            ? 'linear-gradient(180deg,#0A0A18 0%,#080814 100%)'
            : 'linear-gradient(180deg,#0E0E1E 0%,#0C0C1A 20%,#0A0A16 50%,#080814 80%,#060610 100%)',
          border: '1px solid #181830', borderTop: 'none', borderRadius: '0 0 2px 2px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.02),0 3px 8px rgba(0,0,0,.6)',
          zIndex: 1,
        }} />
      </div>
      <div style={{
        position: 'absolute', bottom: small ? 1 : 4, left: 0, right: 0,
        textAlign: 'center' as const, fontSize: small ? 6 : 7.5,
        fontFamily: '"Archivo Black", sans-serif', textTransform: 'uppercase' as const,
        letterSpacing: '.1em', color: isLatched ? '#FF2D87' : '#2A2A44',
        transition: 'color .06s', zIndex: 0, pointerEvents: 'none' as const,
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Shared static styles ─────────────────────────────────────────────────
const s: Record<string, CSSProperties> = {
  scanlines: {
    position: 'absolute', inset: 0,
    background: 'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(255,255,255,.005) 1px,rgba(255,255,255,.005) 2px)',
    pointerEvents: 'none' as const,
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg,transparent 3%,rgba(255,255,255,.1) 25%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.1) 75%,transparent 97%)',
    zIndex: 10,
  },
  screw: {
    position: 'absolute' as const, width: 9, height: 9, borderRadius: '50%',
    background: 'radial-gradient(circle at 38% 32%,#222240,#0E0E22)',
    border: '1px solid #2E2E4A', zIndex: 4,
  },
  guidePost: {
    position: 'absolute' as const, width: 5, height: 18,
    background: 'linear-gradient(90deg,#38385A,#4A4A6E,#38385A)',
    border: '1px solid #4A4A6E', borderRadius: 2,
    top: '50%', transform: 'translateY(-50%)', zIndex: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,.4)',
  },
  heads: {
    position: 'absolute' as const, bottom: -4, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'flex-end', gap: 5, zIndex: 3,
  },
  capstan: { width: 4, height: 22, background: 'linear-gradient(90deg,#4A4A6E,#6A6A8E,#4A4A6E)', borderRadius: 2, boxShadow: '0 0 3px rgba(0,0,0,.4)' },
  roller: { width: 13, height: 20, background: 'linear-gradient(90deg,#1A1A30,#252542,#1A1A30)', border: '1px solid #333', borderRadius: 5 },
  mainHead: { width: 16, height: 14, background: 'linear-gradient(180deg,#4A4A6E,#38385A)', border: '1px solid #5A5A7E', borderRadius: '3px 3px 0 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' },
  eraseHead: { width: 12, height: 12, background: 'linear-gradient(180deg,#38385A,#2A2A48)', border: '1px solid #4A4A6E', borderRadius: '2px 2px 0 0' },
  btnSlot: {
    position: 'relative' as const, background: '#040410',
    border: '2px solid #1A1A2E', borderRadius: 6, padding: 0,
    boxShadow: 'inset 0 6px 16px rgba(0,0,0,.7),inset 0 -2px 6px rgba(0,0,0,.4),inset 2px 0 8px rgba(0,0,0,.4),inset -2px 0 8px rgba(0,0,0,.4),0 1px 0 rgba(255,255,255,.03)',
    display: 'flex', alignItems: 'stretch', overflow: 'hidden',
  },
  slotDiv: {
    width: 3, flexShrink: 0,
    background: 'linear-gradient(180deg,#0C0C1A 0%,#060612 50%,#0C0C1A 100%)',
    borderLeft: '1px solid #1A1A30', borderRight: '1px solid #1A1A30',
  },
  labelText: {
    fontSize: 8, fontFamily: '"Archivo Black", sans-serif',
    letterSpacing: '.12em', textTransform: 'uppercase' as const,
    color: 'rgba(255,45,135,.35)', whiteSpace: 'nowrap' as const, flexShrink: 0,
  },
  labelLine: {
    flex: 1, height: 1, background: 'rgba(255,45,135,.08)',
  },
};

// Need `compact` accessible in TransportBtn label styles — use a closure workaround
// The `compact` variable is available through the parent component's scope
// but TransportBtn is a standalone function. We handle this by passing btnH/edgeH etc as props.
// The label `bottom` and `fontSize` are hardcoded per-variant in the parent render.
