import React from 'react';
import Link from 'next/link';
import { Car } from 'lucide-react';
import PublicNav from './_components/PublicNav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-white">
      {/* Premium Navbar */}
      <PublicNav />

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
                <span className="text-lg font-black tracking-tighter uppercase italic">Fider</span>
              </Link>
              <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm tracking-wide">
                The operating system for Morocco&apos;s car-rental agencies. Trust, fleet and finance on one spine.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#solutions" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Trust Network</Link></li>
                <li><Link href="#enterprise" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Enterprise</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-6">Get started</h4>
              <ul className="space-y-4">
                <li><Link href="#contact" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Request access</Link></li>
                <li><Link href="/login" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Sign in</Link></li>
                <li><Link href="#contact" className="text-sm font-bold text-white/40 hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">© 2026 FIDER. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Made in Morocco</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Casablanca</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
