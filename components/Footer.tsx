"use client";

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
        
        {/* Brand Column */}
        <div className="col-span-1 lg:col-span-2">
          <Link href="/" className="text-2xl font-black tracking-tighter text-white mb-4 block">
            Zelance<span className="text-blue-500">.</span>
          </Link>
          <p className="text-sm font-medium text-slate-400 max-w-sm mb-6">
            The premier marketplace for the AI economy. Connecting elite engineering talent with founders, startups, and businesses of all sizes to build the future.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">𝕏</a>
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">in</a>
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">GH</a>
          </div>
        </div>

        {/* Links Columns */}
        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Platform</h4>
          <ul className="space-y-3 text-sm font-medium text-slate-400">
            <li><Link href="/buyer/discover" className="hover:text-white transition-colors">Hire Talent</Link></li>
            <li><Link href="/buyer/discover?tab=components" className="hover:text-white transition-colors">Asset Store</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">For Builders</h4>
          <ul className="space-y-3 text-sm font-medium text-slate-400">
            <li><Link href="/builder/dashboard" className="hover:text-white transition-colors">Apply as Expert</Link></li>
            <li><Link href="/builder/components/upload" className="hover:text-white transition-colors">Monetize Assets</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Support</h4>
          <ul className="space-y-3 text-sm font-medium text-slate-400">
            <li><Link href="/support" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link href="/support/tickets" className="hover:text-white transition-colors">My Tickets</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Legal</h4>
          <ul className="space-y-3 text-sm font-medium text-slate-400">
            <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/refund-escrow-policy" className="hover:text-white transition-colors">Refund & Escrow Policy</Link></li>
            <li><Link href="/community-guidelines" className="hover:text-white transition-colors">Community Guidelines</Link></li>
            <li><Link href="/ai-intellectual-property-policy" className="hover:text-white transition-colors">AI & Intellectual Property Policy</Link></li>
            <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            <li><Link href="/trust-safety" className="hover:text-white transition-colors">Trust & Safety</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">© {new Date().getFullYear()} Zelance Inc. All rights reserved.</p>
        <a href="mailto:support@zelance.co" className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">support@zelance.co</a>
      </div>
    </footer>
  );
}