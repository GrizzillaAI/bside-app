// Mixd — Retro Cassette Deck Player
// Desktop: lives inside a left-column panel (no outer chrome — AppLayout provides nav/search).
// Mobile: cassette body is collapsible; transport buttons always visible.
// Transport buttons latch/unlatch with a synthesized mechanical click sound.

import { useState, useRef, useCallback, useReducer, type ReactNode, type CSSProperties } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { usePlayer, formatTime } from '../lib/player';

// ── Web Audio click sound ────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function clickSound() {
  // Synthesised cassette deck button press — modelled on real tape player
  // transport buttons (heavy plastic keys bottoming out on metal chassis).
  //  1. Initial plastic-on-metal impact "clack" (broadband transient, ~4ms)
  //  2. Chassis resonance thud (low ~55-75Hz body, ~80ms decay)
  //  3. Latch engagement click (sharp mid-freq burst, ~3ms, delayed 6ms)
  //  4. Mechanical settle (very short filtered rattle, ~35ms)
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const sr = ctx.sampleRate;
  const now = ctx.currentTime;

  // ── Layer 1: Plastic impact clack (broadband, plastic character) ──
  const clackLen = Math.floor(sr * 0.005);
  const clackBuf = ctx.createBuffer(1, clackLen, sr);
  const clackD = clackBuf.getChannelData(0);
  for (let i = 0; i < clackLen; i++) {
    const t = i / sr;
    // Sharp exponential decay with a resonant plastic ring
    const env = Math.exp(-t * 1200);
    const ring = Math.sin(2 * Math.PI * 4200 * t) * 0.3;
    clackD[i] = ((Math.random() * 2 - 1) * 0.7 + ring) * env;
  }
  const clackSrc = ctx.createBufferSource();
  clackSrc.buffer = clackBuf;
  const clackBp = ctx.createBiquadFilter();
  clackBp.type = 'bandpass'; clackBp.frequency.value = 2800; clackBp.Q.value = 0.8;
  const clackGain = ctx.createGain();
  clackGain.gain.value = 0.45;
  clackSrc.connect(clackBp).connect(clackGain).connect(ctx.destination);
  clackSrc.start(now);

  // ── Layer 2: Chassis body thud (deep, heavy, short) ──
  const thudLen = Math.floor(sr * 0.08);
  const thudBuf = ctx.createBuffer(1, thudLen, sr);
  const thudD = thudBuf.getChannelData(0);
  for (let i = 0; i < thudLen; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 50);
    // Chassis resonance — heavy low frequencies
    const f1 = Math.sin(2 * Math.PI * 58 * t) * 1.0;
    const f2 = Math.sin(2 * Math.PI * 110 * t) * 0.4;
    // Slight pitch drop as the button seats (more realistic)
    const f3 = Math.sin(2 * Math.PI * (200 - t * 2000) * t) * 0.15;
    thudD[i] = (f1 + f2 + f3) * env;
  }
  const thudSrc = ctx.createBufferSource();
  thudSrc.buffer = thudBuf;
  const thudLp = ctx.createBiquadFilter();
  thudLp.type = 'lowpass'; thudLp.frequency.value = 400;
  const thudGain = ctx.createGain();
  thudGain.gain.value = 0.55;
  thudSrc.connect(thudLp).connect(thudGain).connect(ctx.destination);
  thudSrc.start(now);

  // ── Layer 3: Latch engagement click (sharp metallic snap, delayed) ──
  const latchLen = Math.floor(sr * 0.004);
  const latchBuf = ctx.createBuffer(1, latchLen, sr);
  const latchD = latchBuf.getChannelData(0);
  for (let i = 0; i < latchLen; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 1500);
    // Metallic ring at ~3.5kHz — the "click" of the latch catching
    latchD[i] = (Math.sin(2 * Math.PI * 3500 * t) * 0.6 + (Math.random() * 2 - 1) * 0.4) * env;
  }
  const latchSrc = ctx.createBufferSource();
  latchSrc.buffer = latchBuf;
  const latchHp = ctx.createBiquadFilter();
  latchHp.type = 'highpass'; latchHp.frequency.value = 2000;
  const latchGain = ctx.createGain();
  latchGain.gain.value = 0.3;
  latchSrc.connect(latchHp).connect(latchGain).connect(ctx.destination);
  latchSrc.start(now + 0.006); // delayed — latch engages after button bottoms out

  // ── Layer 4: Mechanical settle (very brief filtered rattle) ──
  const settleLen = Math.floor(sr * 0.035);
  const settleBuf = ctx.createBuffer(1, settleLen, sr);
  const settleD = settleBuf.getChannelData(0);
  for (let i = 0; i < settleLen; i++) {
    const t = i / sr;
    const onset = Math.max(0, 1 - Math.exp(-(t - 0.008) * 500));
    const env = onset * Math.exp(-(t - 0.008) * 100);
    settleD[i] = (Math.random() * 2 - 1) * env;
  }
  const settleSrc = ctx.createBufferSource();
  settleSrc.buffer = settleBuf;
  const settleBp = ctx.createBiquadFilter();
  settleBp.type = 'bandpass'; settleBp.frequency.value = 1200; settleBp.Q.value = 3;
  const settleGain = ctx.createGain();
  settleGain.gain.value = 0.12;
  settleSrc.connect(settleBp).connect(settleGain).connect(ctx.destination);
  settleSrc.start(now);
}

// ── Component ────────────────────────────────────────────────────────────
interface CassetteDeckProps {
  embedBlock: ReactNode;
  youtubeBlock?: ReactNode; // visible YouTube embed (mobile: rendered inside tape window)
  compact?: boolean; // mobile compact layout
}

type LatchedButton = 'play' | 'stop' | null;

export default function CassetteDeck({ embedBlock, youtubeBlock, compact = false }: CassetteDeckProps) {
  const {
    currentTrack, isPlaying, currentTime, duration,
    seek, skipNext, skipPrev, pause, resume,
  } = usePlayer();

  const [cassetteExpanded, setCassetteExpanded] = useState(!compact);

  const latched: LatchedButton = isPlaying ? 'play' : 'stop';

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
  const CASSETTE_RATIO = '102 / 64';
  const pad = compact ? 10 : 14;
  const btnH = compact ? 52 : 60;
  const keyH = compact ? 30 : 34;
  const edgeH = compact ? 8 : 10;
  const latchOffset = compact ? 6 : 8;
  const latchEdge = compact ? 2 : 3;

  // Should we show the cassette visual?
  // Auto-expand on mobile when YouTube is active (iframe must be visible to play)
  const showCassette = compact ? (cassetteExpanded || !!youtubeBlock) : true;

  return (
    <div className="cassette-deck" style={{
      width: '100%',
      position: 'relative',
      userSelect: 'none',
      background: compact
        ? 'linear-gradient(180deg,#161628 0%,#0B0B18 100%)'
        : 'transparent',
      borderTop: compact ? '1px solid #2E2E48' : 'none',
      flexShrink: 0,
      overflow: 'hidden',
    }}>

      {/* ── Mobile: expand/collapse toggle bar (hidden when YouTube forces expand) ── */}
      {compact && !youtubeBlock && (
        <button
          onClick={() => setCassetteExpanded(!cassetteExpanded)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '6px 0 2px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#5E5E7A',
          }}
        >
          {/* Mini cassette icon */}
          <svg width="16" height="12" viewBox="0 0 32 20" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="30" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="21" cy="11" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
            <rect x="8" y="3" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="0.8" fill="none" />
          </svg>
          {cassetteExpanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronUp className="w-4 h-4" />
          }
        </button>
      )}

      {/* ── Cassette visual (collapsible on mobile) ── */}
      {showCassette && (
        <div style={{
          padding: `${compact ? 4 : 0}px ${pad}px 0`,
        }}>
          {/* Tape well */}
          <div style={{
            background: 'linear-gradient(180deg,#07071A 0%,#050516 100%)',
            border: '2px solid #2A2A46',
            borderRadius: compact ? 6 : 8,
            padding: compact ? '8px 10px 6px' : '12px 14px 10px',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,.6),inset 0 -2px 8px rgba(0,0,0,.3)',
          }}>
            {/* Cassette body */}
            <div style={{
              width: '100%',
              aspectRatio: CASSETTE_RATIO,
              position: 'relative',
              background: 'linear-gradient(180deg,#1C1C36 0%,#161632 40%,#12122A 100%)',
              border: '1px solid #2A2A48',
              borderRadius: compact ? '6px 6px 4px 4px' : '8px 8px 5px 5px',
              boxShadow: '0 3px 8px rgba(0,0,0,.35)',
            }}>
              {/* Corner screws — desktop only */}
              {!compact && (
                <>
                  <div style={{ ...s.screw, top: '5%', left: '2.5%' }} />
                  <div style={{ ...s.screw, top: '5%', right: '2.5%' }} />
                  <div style={{ ...s.screw, bottom: '5%', left: '2.5%' }} />
                  <div style={{ ...s.screw, bottom: '5%', right: '2.5%' }} />
                </>
              )}

              {/* Label strip */}
              <div style={{
                position: 'absolute', top: '5%', left: '6%', right: '6%', height: '22%',
                background: 'linear-gradient(180deg,rgba(255,45,135,.08) 0%,rgba(255,45,135,.03) 100%)',
                border: '1px solid rgba(255,45,135,.12)', borderRadius: 3,
                display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, zIndex: 3,
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

              {/* Tape window oval */}
              <div style={{
                position: 'absolute', top: '30%', left: '7%', right: '7%', bottom: '6%',
                background: 'rgba(3,3,14,.7)', border: '1px solid rgba(255,45,135,.05)',
                borderRadius: (compact && youtubeBlock) ? '12%' : '40%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                transition: 'border-radius .3s ease',
              }}>
                {/* YouTube video inside tape window — mobile only (desktop uses floating PIP) */}
                {compact && youtubeBlock && (
                  <div className="yt-tape-window" style={{ position: 'absolute', inset: 0, zIndex: 5, borderRadius: 'inherit', overflow: 'hidden' }}>
                    {youtubeBlock}
                  </div>
                )}
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

                {/* Left reel */}
                <div style={{ position: 'relative', zIndex: 1, marginRight: 'auto', marginLeft: '12%' }}>
                  <div className="cassette-reel" style={{
                    width: compact ? 36 : 52, height: compact ? 36 : 52, borderRadius: '50%',
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: isPlaying ? 'cassette-spin 2.4s linear infinite' : 'none',
                  }}>
                    <div style={{ position: 'absolute', borderRadius: '50%', background: 'repeating-radial-gradient(circle,rgba(255,45,135,.02) 0px,rgba(255,45,135,.05) 1px,rgba(255,45,135,.02) 2.5px)', border: '1px solid rgba(255,45,135,.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: (compact ? 22 : 34) + progress * (compact ? 12 : 16), height: (compact ? 22 : 34) + progress * (compact ? 12 : 16) }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(60,60,96,.45)', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }} />
                    <Hub size={compact ? 14 : 22} />
                  </div>
                </div>

                {/* Right reel */}
                <div style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', marginRight: '12%' }}>
                  <div className="cassette-reel" style={{
                    width: compact ? 36 : 52, height: compact ? 36 : 52, borderRadius: '50%',
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: isPlaying ? 'cassette-spin 1.6s linear infinite' : 'none',
                  }}>
                    <div style={{ position: 'absolute', borderRadius: '50%', background: 'repeating-radial-gradient(circle,rgba(255,45,135,.02) 0px,rgba(255,45,135,.05) 1px,rgba(255,45,135,.02) 2.5px)', border: '1px solid rgba(255,45,135,.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: (compact ? 34 : 48) - progress * (compact ? 12 : 16), height: (compact ? 34 : 48) - progress * (compact ? 12 : 16) }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(60,60,96,.45)', boxShadow: 'inset 0 0 6px rgba(0,0,0,.35)' }} />
                    <Hub size={compact ? 14 : 22} />
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
          </div>
        </div>
      )}

      {/* ── Now playing info ── */}
      <div style={{
        padding: `${compact ? 4 : 8}px ${pad}px ${compact ? 2 : 4}px`,
        display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, minWidth: 0, overflow: 'hidden',
      }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, overflow: 'hidden' }}>
          <span style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: '#EDEDF3', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em', minWidth: 0, flexShrink: 1 }}>
            {currentTrack?.title ?? 'No track loaded'}
          </span>
          {currentTrack && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#5E5E7A', flexShrink: 0 }} />
              <span style={{ fontSize: compact ? 10 : 11, color: '#A0A0B8', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
                {currentTrack.artist}
              </span>
            </>
          )}
        </div>
        {currentTrack && (
          <span style={{ fontSize: 10, color: '#5E5E7A', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>

      {/* ═══ TRANSPORT BUTTONS (always visible) ═══ */}
      <div style={{ padding: `0 ${pad}px ${compact ? 6 : 8}px` }}>
        <div style={s.btnSlot}>
          {/* On mobile, hide Stop */}
          {!compact && (
            <>
              <TransportBtn id="stop" isLatched={latched === 'stop'} onClick={doStop} label="Stop" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </TransportBtn>
              <div style={s.slotDiv} />
            </>
          )}

          <TransportBtn id="skb" isLatched={false} isMomentary onClick={doSkipBack} label="⏮" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 14 : 16} height={compact ? 10 : 12} viewBox="0 0 28 18" fill="currentColor"><rect x="1" y="2" width="3.5" height="14" rx="1.2"/><polygon points="24,2 11,9 24,16"/></svg>
          </TransportBtn>

          <TransportBtn id="rew" isLatched={false} isMomentary onClick={doRew} label="Rew" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 14 : 16} height={compact ? 10 : 12} viewBox="0 0 26 18" fill="currentColor"><polygon points="13,2 1,9 13,16"/><polygon points="25,2 13,9 25,16"/></svg>
          </TransportBtn>

          <TransportBtn id="ff" isLatched={false} isMomentary onClick={doFF} label="FF" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 14 : 16} height={compact ? 10 : 12} viewBox="0 0 26 18" fill="currentColor"><polygon points="1,2 13,9 1,16"/><polygon points="13,2 25,9 13,16"/></svg>
          </TransportBtn>

          <TransportBtn id="skf" isLatched={false} isMomentary onClick={doSkipFwd} label="⏭" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 14 : 16} height={compact ? 10 : 12} viewBox="0 0 28 18" fill="currentColor"><polygon points="4,2 17,9 4,16"/><rect x="23.5" y="2" width="3.5" height="14" rx="1.2"/></svg>
          </TransportBtn>

          <div style={s.slotDiv} />

          <TransportBtn id="play" isLatched={latched === 'play'} isWide onClick={() => { clickSound(); if (!isPlaying && currentTrack) resume(); }} label="Play" btnH={btnH} keyH={keyH} edgeH={edgeH} latchOffset={latchOffset} latchEdge={latchEdge} small={compact}>
            <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>
          </TransportBtn>
        </div>
      </div>

      {/* Desktop footer text */}
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `2px ${pad}px 6px`, fontSize: 7, color: '#1E1E38', letterSpacing: '.06em' }}>
          <span>Dolby NR · HX Pro</span>
          <span>© 2026 Grizzilla</span>
        </div>
      )}

      {/* Hidden embed block — iframes for actual playback */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
        {embedBlock}
      </div>

      <style>{`
        @keyframes cassette-spin {
          to { transform: rotate(360deg); }
        }
        /* Override YouTubeEmbed sizing when rendered inside tape window */
        .yt-tape-window > div {
          width: 100% !important;
          height: 100% !important;
        }
        .yt-tape-window > div > div {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
      `}</style>
    </div>
  );
}

// ── Hub sub-component ────────────────────────────────────────────────────
function Hub({ size = 22 }: { size?: number }) {
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
          position: 'absolute', width: 3, height: tkH,
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
        position: 'absolute', bottom: small ? 1 : 2, left: 0, right: 0,
        textAlign: 'center' as const, fontSize: small ? 5 : 6,
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
  screw: {
    position: 'absolute' as const, width: 7, height: 7, borderRadius: '50%',
    background: 'radial-gradient(circle at 38% 32%,#222240,#0E0E22)',
    border: '1px solid #2E2E4A', zIndex: 4,
  },
  guidePost: {
    position: 'absolute' as const, width: 4, height: 14,
    background: 'linear-gradient(90deg,#38385A,#4A4A6E,#38385A)',
    border: '1px solid #4A4A6E', borderRadius: 2,
    top: '50%', transform: 'translateY(-50%)', zIndex: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,.4)',
  },
  heads: {
    position: 'absolute' as const, bottom: -3, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'flex-end', gap: 4, zIndex: 3,
  },
  capstan: { width: 3, height: 16, background: 'linear-gradient(90deg,#4A4A6E,#6A6A8E,#4A4A6E)', borderRadius: 2, boxShadow: '0 0 3px rgba(0,0,0,.4)' },
  roller: { width: 10, height: 14, background: 'linear-gradient(90deg,#1A1A30,#252542,#1A1A30)', border: '1px solid #333', borderRadius: 4 },
  mainHead: { width: 12, height: 10, background: 'linear-gradient(180deg,#4A4A6E,#38385A)', border: '1px solid #5A5A7E', borderRadius: '2px 2px 0 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' },
  eraseHead: { width: 9, height: 9, background: 'linear-gradient(180deg,#38385A,#2A2A48)', border: '1px solid #4A4A6E', borderRadius: '2px 2px 0 0' },
  btnSlot: {
    position: 'relative' as const, background: '#040410',
    border: '2px solid #1A1A2E', borderRadius: 6, padding: 0,
    boxShadow: 'inset 0 6px 16px rgba(0,0,0,.7),inset 0 -2px 6px rgba(0,0,0,.4),inset 2px 0 8px rgba(0,0,0,.4),inset -2px 0 8px rgba(0,0,0,.4),0 1px 0 rgba(255,255,255,.03)',
    display: 'flex', alignItems: 'stretch', overflow: 'hidden',
  },
  slotDiv: {
    width: 2, flexShrink: 0,
    background: 'linear-gradient(180deg,#0C0C1A 0%,#060612 50%,#0C0C1A 100%)',
    borderLeft: '1px solid #1A1A30', borderRight: '1px solid #1A1A30',
  },
  labelText: {
    fontSize: 7, fontFamily: '"Archivo Black", sans-serif',
    letterSpacing: '.12em', textTransform: 'uppercase' as const,
    color: 'rgba(255,45,135,.35)', whiteSpace: 'nowrap' as const, flexShrink: 0,
  },
  labelLine: {
    flex: 1, height: 1, background: 'rgba(255,45,135,.08)',
  },
};
