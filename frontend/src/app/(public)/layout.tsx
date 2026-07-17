import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Car } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-white">
      {/* Premium Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">Infinity</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">Features</Link>
            <Link href="#solutions" className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">Solutions</Link>
            <Link href="#enterprise" className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">Enterprise</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-[11px] font-black uppercase tracking-[0.2em]">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="text-[11px] font-black uppercase tracking-[0.2em] px-6">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-white/5 py-20 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
               <Link href="/landing" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black tracking-tighter uppercase italic">Infinity</span>
              </Link>
              <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm uppercase tracking-wide">
                The intelligence layer for modern car rental ecosystems. Engineered for scale, speed, and absolute trust.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-6">Ecosystem</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">The Guardian</Link></li>
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Financial Brain</Link></li>
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Trust Vault</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Terms</Link></li>
                <li><Link href="#" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">© 2024 CARHUB INFINITY OS. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">LONDON</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">CASABLANCA</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">DUBAI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
