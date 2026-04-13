import React from 'react';
import { Link } from 'react-router-dom';
import {
  Music,
  Search,
  Library,
  Headphones,
  Users,
  Wifi,
  Star,
  Zap,
  Check,
  ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080C] text-[#EEEEF2] overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center px-4 pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-[#FF4F2B] to-[#6930FF] rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-[#6930FF] to-[#FF4F2B] rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#FF4F2B]/8 rounded-full border border-[#FF4F2B]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F2B] animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase text-[#FF8C72]">Audio Without Borders</span>
            </div>
          </div>

          <h1 className="font-display text-7xl md:text-8xl font-bold mb-6 text-[#FAFAFC] leading-none" style={{ letterSpacing: '-4px' }}>
            B<span className="text-[#FF4F2B]">-</span>Side
          </h1>

          <p className="text-xl text-[#9898AA] mb-10 max-w-xl mx-auto leading-relaxed">
            The world's best music lives on video platforms. We set it free. One tap to extract. One library to rule them all.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/signup"
              className="px-8 py-4 bg-[#FF4F2B] hover:bg-[#E63D1A] rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/signin"
              className="px-8 py-4 bg-[#0E0E14] hover:bg-[#16161F] border border-[#2A2A3A] rounded-lg font-semibold text-[#FAFAFC] transition-all duration-200"
            >
              Sign In
            </Link>
          </div>

          <p className="text-xs tracking-widest uppercase text-[#2A2A3A]">A Grizzilla AI / Bucky Ventures Product</p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-[#08080C]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-xs font-semibold tracking-[3px] uppercase text-[#FF4F2B] mb-4">How It Works</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#FAFAFC]" style={{ letterSpacing: '-2px' }}>Search. Extract. Listen.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-[2px] bg-[#FAFAFC]/[0.03] rounded-2xl overflow-hidden">
            <div className="bg-[#0E0E14] p-12">
              <p className="font-display text-5xl font-bold text-[#FF4F2B] opacity-30 mb-4">01</p>
              <h3 className="font-display text-xl font-semibold text-[#FAFAFC] mb-3" style={{ letterSpacing: '-0.5px' }}>Search</h3>
              <p className="text-sm text-[#9898AA] leading-relaxed">Find audio content from YouTube, TikTok, Instagram, and anywhere on the web.</p>
            </div>
            <div className="bg-[#0E0E14] p-12">
              <p className="font-display text-5xl font-bold text-[#FF4F2B] opacity-30 mb-4">02</p>
              <h3 className="font-display text-xl font-semibold text-[#FAFAFC] mb-3" style={{ letterSpacing: '-0.5px' }}>Extract</h3>
              <p className="text-sm text-[#9898AA] leading-relaxed">One tap to rip the audio and save it to your personal library. No video, just sound.</p>
            </div>
            <div className="bg-[#0E0E14] p-12">
              <p className="font-display text-5xl font-bold text-[#FF4F2B] opacity-30 mb-4">03</p>
              <h3 className="font-display text-xl font-semibold text-[#FAFAFC] mb-3" style={{ letterSpacing: '-0.5px' }}>Listen</h3>
              <p className="text-sm text-[#9898AA] leading-relaxed">Seamless audio-only playback. Build playlists. Discover what Spotify doesn't carry.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent via-[#FAFAFC]/[0.08] to-transparent" />

      {/* Features Grid Section */}
      <section className="py-24 px-4 bg-[#08080C]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-xs font-semibold tracking-[3px] uppercase text-[#FF4F2B] mb-4">Features</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#FAFAFC]" style={{ letterSpacing: '-2px' }}>Built for Crate Diggers</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Audio Extraction', desc: 'Rip audio from any video link — YouTube, TikTok, Instagram. One tap.' },
              { icon: Wifi, title: 'Multi-Source', desc: 'If it exists as audio anywhere on the internet, B-Side can find and extract it.' },
              { icon: Library, title: 'Smart Library', desc: 'Your personal collection of extracted audio, organized and always available.' },
              { icon: Star, title: 'Creator Attribution', desc: 'Every play fires a callback to the original creator. We amplify, not steal.' },
              { icon: Search, title: 'Deep Discovery', desc: 'Find Tiny Desk sessions, live takes, acoustic covers — the music algorithms miss.' },
              { icon: Headphones, title: 'Audio-Only Player', desc: 'No video. No distractions. Just clean, focused audio playback.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-[#0E0E14] p-8 rounded-xl border border-[#FAFAFC]/[0.04] hover:border-[#FF4F2B]/30 transition-all duration-200">
                <div className="w-10 h-10 bg-[#FF4F2B]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#FF4F2B]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#FF4F2B]" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#FAFAFC] mb-2" style={{ letterSpacing: '-0.5px' }}>{title}</h3>
                <p className="text-sm text-[#9898AA] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent via-[#FAFAFC]/[0.08] to-transparent" />

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-[#08080C]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-xs font-semibold tracking-[3px] uppercase text-[#FF4F2B] mb-4">Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#FAFAFC]" style={{ letterSpacing: '-2px' }}>Simple Pricing</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <div className="bg-[#0E0E14] p-8 rounded-xl border border-[#FAFAFC]/[0.04] flex flex-col">
              <h3 className="font-display text-2xl font-bold text-[#FAFAFC] mb-2">Free</h3>
              <p className="text-sm text-[#9898AA] mb-6">Start digging through the crates</p>
              <div className="mb-8">
                <span className="font-display text-4xl font-bold text-[#FAFAFC]">$0</span>
                <span className="font-mono text-sm text-[#5A5A72] ml-2">/month</span>
              </div>
              <Link to="/signup" className="block w-full px-6 py-3 bg-[#16161F] hover:bg-[#1E1E2A] border border-[#2A2A3A] rounded-lg font-semibold text-[#FAFAFC] transition-all duration-200 mb-8 text-center">
                Get Started
              </Link>
              <div className="space-y-4 flex-1">
                {['50 tracks in library', '3 playlists', 'Audio extraction', 'YouTube search'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#00D68F]" />
                    <span className="text-sm text-[#CCCCD8]">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-b from-[#FF4F2B]/10 to-[#0E0E14] p-8 rounded-xl border border-[#FF4F2B]/30 flex flex-col ring-1 ring-[#FF4F2B]/20">
              <div className="inline-flex w-fit px-3 py-1 bg-[#FF4F2B] rounded-full text-xs font-semibold mb-4 text-white">
                Most Popular
              </div>
              <h3 className="font-display text-2xl font-bold text-[#FAFAFC] mb-2">Premium</h3>
              <p className="text-sm text-[#9898AA] mb-6">Unlimited access to everything</p>
              <div className="mb-8">
                <span className="font-display text-4xl font-bold text-[#FAFAFC]">$4.99</span>
                <span className="font-mono text-sm text-[#5A5A72] ml-2">/month</span>
              </div>
              <Link to="/signup" className="block w-full px-6 py-3 bg-[#FF4F2B] hover:bg-[#E63D1A] rounded-lg font-semibold text-white transition-all duration-200 mb-8 text-center">
                Start Free Trial
              </Link>
              <div className="space-y-4 flex-1">
                {['Everything in Free', 'Unlimited tracks & playlists', 'Multi-source extraction', 'Priority discovery', 'Ad-free experience'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#FF4F2B]" />
                    <span className="text-sm text-[#CCCCD8]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-[#08080C] border-t border-[#FAFAFC]/[0.06] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1 mb-4">
                <span className="font-display text-xl font-bold text-[#FAFAFC]" style={{ letterSpacing: '-0.5px' }}>B<span className="text-[#FF4F2B]">-</span>Side</span>
              </div>
              <p className="text-[#9898AA] text-sm">The crate digger's tool for the streaming age.</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#FAFAFC] mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-[#9898AA] text-sm">
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#FAFAFC] mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-[#9898AA] text-sm">
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#FAFAFC] mb-4 text-sm">Follow Us</h4>
              <ul className="space-y-2 text-[#9898AA] text-sm">
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-[#FAFAFC] transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#FAFAFC]/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center text-[#5A5A72] text-sm">
            <p>&copy; 2026 B-Side. A Bucky Ventures product.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#FAFAFC] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#FAFAFC] transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
