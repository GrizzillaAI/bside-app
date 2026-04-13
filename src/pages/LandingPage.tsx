import { Link } from 'react-router-dom';
import {
  Layers, Library, Music, Radio, Star, Zap, Check, ArrowRight, Youtube,
} from 'lucide-react';
import { LogoMark, Wordmark } from '../components/Logo';

// Mixd landing page — brand kit: "Mix everything." Signal Pink #FF2D87 on Ink #050509.
// Voice: active verbs, short punchy sentences. "Mix is a verb."

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink text-pearl overflow-hidden">
      {/* Top nav */}
      <nav className="sticky top-0 z-20 bg-ink/85 backdrop-blur-md border-b border-slate/70">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <Wordmark size={22} />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/signin" className="text-sm text-silver hover:text-white transition px-3 py-2">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold bg-pink hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition"
            >
              Start mixing
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-pink rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-cobalt rounded-full mix-blend-screen filter blur-[120px] opacity-15 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-lime rounded-full mix-blend-screen filter blur-[100px] opacity-10" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-pink/10 rounded-full border border-pink/30 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-pink animate-pulse" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-pink-200">
              Audio without borders
            </span>
          </div>

          <h1
            className="font-display font-black text-7xl md:text-[9rem] leading-[0.9] text-pearl mb-8"
            style={{ letterSpacing: '-0.04em' }}
          >
            Mix<br />
            <span className="text-pink">everything.</span>
          </h1>

          <p className="text-xl md:text-2xl text-silver mb-12 max-w-2xl mx-auto leading-relaxed">
            The world's best audio lives across a dozen platforms. Mixd pulls it into one.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              to="/signup"
              className="group px-8 py-4 bg-pink hover:bg-pink-600 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2"
            >
              Start mixing — free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/signin"
              className="px-8 py-4 bg-void hover:bg-graphite border border-slate rounded-lg font-semibold text-pearl transition"
            >
              Sign in
            </Link>
          </div>

          {/* Source badges */}
          <div className="flex flex-wrap gap-3 justify-center items-center mb-4">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ash">Pulls from:</span>
            {['YouTube', 'Spotify', 'Apple Music', 'SoundCloud', 'TikTok', 'Podcasts'].map((src) => (
              <span key={src} className="font-mono text-[11px] tracking-wider uppercase text-silver px-3 py-1 border border-slate rounded-full">
                {src}
              </span>
            ))}
          </div>

          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-smoke mt-12">
            A Grizzilla AI / Bucky Ventures Product
          </p>
        </div>
      </section>

      {/* Three pillars */}
      <section className="py-24 px-4 bg-ink border-t border-slate/60">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-xs font-semibold tracking-[0.25em] uppercase text-pink mb-4">01 — The Pillars</p>
            <h2 className="font-display font-black text-5xl md:text-7xl text-pearl" style={{ letterSpacing: '-0.03em' }}>
              Three ideas.<br />One app.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                tag: 'Active, not passive',
                title: 'You make the mix.',
                desc: 'Other apps tell you what to listen to. Mixd hands you the tools. Paste a link from anywhere. Pull the audio. Drop it in the playlist that becomes the mix that becomes your sound.',
              },
              {
                num: '02',
                tag: 'Sourced from everywhere',
                title: 'All platforms. One library.',
                desc: "Mixd is the first audio app that doesn't care where the sound lives. YouTube, Spotify, Apple Music, SoundCloud, podcasts — we flatten the walls and give you one library.",
              },
              {
                num: '03',
                tag: 'Creators win louder',
                title: 'Every play pays back.',
                desc: "Every stream on Mixd fires attribution back to the original platform. Your play counts twice — once on your mix, once on their channel. We amplify. We don't siphon.",
              },
            ].map(({ num, tag, title, desc }) => (
              <div key={num} className="bg-void border border-slate rounded-2xl p-8 hover:border-pink/50 transition">
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ash mb-6">{num} — {tag}</p>
                <h3 className="font-display font-black text-3xl text-pearl mb-4" style={{ letterSpacing: '-0.02em' }}>
                  {title}
                </h3>
                <p className="text-silver leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-ink border-t border-slate/60">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-xs font-semibold tracking-[0.25em] uppercase text-pink mb-4">02 — How it works</p>
            <h2 className="font-display font-black text-5xl md:text-7xl text-pearl" style={{ letterSpacing: '-0.03em' }}>
              Search. Mix. Play.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-[2px] bg-white/[0.04] rounded-2xl overflow-hidden">
            {[
              { num: '01', title: 'Search', desc: 'Hit search. Mixd queries YouTube, Spotify, Apple Music, and SoundCloud at once.' },
              { num: '02', title: 'Mix', desc: 'Pull audio from any source. Drop it into a playlist. Your crate, your rules.' },
              { num: '03', title: 'Play', desc: 'Seamless playback across sources. No video. No distraction. Just sound.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="bg-void p-12">
                <p className="font-display font-black text-6xl text-pink/30 mb-4">{num}</p>
                <h3 className="font-display font-black text-2xl text-pearl mb-3" style={{ letterSpacing: '-0.02em' }}>
                  {title}
                </h3>
                <p className="text-silver leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-ink border-t border-slate/60">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-xs font-semibold tracking-[0.25em] uppercase text-pink mb-4">03 — Built for crate diggers</p>
            <h2 className="font-display font-black text-5xl md:text-7xl text-pearl" style={{ letterSpacing: '-0.03em' }}>
              Every tool you need.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Layers, title: 'Multi-source search', desc: 'YouTube, Spotify, Apple Music, SoundCloud — one search box.' },
              { icon: Zap, title: 'Audio extraction', desc: 'Rip audio from any video link. One tap. No video, just sound.' },
              { icon: Library, title: 'Smart library', desc: 'Your extracted audio, organized and always available.' },
              { icon: Star, title: 'Creator attribution', desc: 'Every play fires back to the original source. We amplify, not steal.' },
              { icon: Radio, title: 'Deep discovery', desc: 'Tiny Desk, KEXP, Boiler Room — the music algorithms miss.' },
              { icon: Music, title: 'Audio-only player', desc: 'No video. No autoplay next. Clean, focused listening.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-void p-8 rounded-xl border border-slate hover:border-pink/40 transition">
                <div className="w-10 h-10 bg-pink/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink/20 transition-colors">
                  <Icon className="w-5 h-5 text-pink" />
                </div>
                <h3 className="font-display font-bold text-lg text-pearl mb-2" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
                <p className="text-sm text-silver leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-ink border-t border-slate/60">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-xs font-semibold tracking-[0.25em] uppercase text-pink mb-4">04 — Pricing</p>
            <h2 className="font-display font-black text-5xl md:text-7xl text-pearl" style={{ letterSpacing: '-0.03em' }}>
              Two plans.<br />No maze.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Free */}
            <div className="bg-void p-8 rounded-2xl border border-slate flex flex-col">
              <h3 className="font-display font-black text-3xl text-pearl mb-2">Free</h3>
              <p className="text-sm text-silver mb-6">Start digging. No card.</p>
              <div className="mb-8">
                <span className="font-display font-black text-5xl text-pearl">$0</span>
                <span className="font-mono text-sm text-ash ml-2">/mo</span>
              </div>
              <Link to="/signup" className="block w-full px-6 py-3 bg-graphite hover:bg-slate border border-slate rounded-lg font-semibold text-pearl transition mb-8 text-center">
                Get started
              </Link>
              <div className="space-y-3 flex-1">
                {['50 tracks in library', '3 playlists', 'All source search', 'Audio extraction'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-cloud">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div className="relative bg-gradient-to-b from-pink/10 to-void p-8 rounded-2xl border border-pink/40 flex flex-col">
              <div className="absolute -top-3 left-8 inline-flex px-3 py-1 bg-lime rounded-full">
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-ink">Most popular</span>
              </div>
              <h3 className="font-display font-black text-3xl text-pearl mb-2">Premium</h3>
              <p className="text-sm text-silver mb-6">Everything unlocked.</p>
              <div className="mb-8">
                <span className="font-display font-black text-5xl text-pearl">$4.99</span>
                <span className="font-mono text-sm text-ash ml-2">/mo</span>
              </div>
              <Link to="/signup" className="block w-full px-6 py-3 bg-pink hover:bg-pink-600 rounded-lg font-semibold text-white transition mb-8 text-center">
                Start free trial
              </Link>
              <div className="space-y-3 flex-1">
                {[
                  'Everything in Free',
                  'Unlimited tracks & playlists',
                  'Priority extraction',
                  'Full-length streaming',
                  'Ad-free forever',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-pink" />
                    <span className="text-sm text-cloud">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink border-t border-slate/60 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="font-display font-black text-4xl md:text-6xl text-pearl leading-none" style={{ letterSpacing: '-0.03em' }}>
              Mix <span className="text-pink">everything.</span>
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LogoMark size={24} />
                <Wordmark size={20} />
              </div>
              <p className="text-sm text-silver">The crate digger's tool for the streaming age.</p>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-ash mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-silver">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-ash mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-silver">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-ash mb-4">Follow</h4>
              <ul className="space-y-2 text-sm text-silver">
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-ash">
            <p>&copy; 2026 Mixd. A Bucky Ventures / Grizzilla AI product.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <span className="font-mono text-[10px] tracking-widest uppercase text-smoke">mixd.app</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
