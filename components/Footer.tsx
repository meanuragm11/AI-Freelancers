import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand & Copyright */}
        <div className="flex flex-col items-center md:items-start">
          <span className="text-xl font-black tracking-tight text-slate-900 mb-2">
            Zelance<span className="text-blue-600">.</span>
          </span>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            © 2026 Zelance. All rights reserved.
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex gap-6">
          <Link href="/terms" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
            Privacy Policy
          </Link>
          <Link href="/support" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
            Support
          </Link>
        </div>

      </div>
    </footer>
  );
}