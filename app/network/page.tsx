import React from 'react';
import {
ChartBarIcon,
InboxArrowDownIcon,
DocumentTextIcon,
CodeBracketIcon,
UserGroupIcon,
MagnifyingGlassIcon,
CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function BuilderNetwork() {
  return (
    <div className="flex">
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="text-lg font-bold text-slate-900">Platform<span className="text-blue-600">.ai</span></span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">Builder</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="/builder" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
            <ChartBarIcon className="w-5 h-5"/>
            Performance
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
            <DocumentTextIcon className="w-5 h-5"/>
            My Listings
          </a>
          <a href="#" className="flex items-center justify-between px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
            <div className="flex items-center gap-3">
              <InboxArrowDownIcon className="w-5 h-5"/>
              Lead Inbox
            </div>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
            <CodeBracketIcon className="w-5 h-5"/>
            Webhook Sync
          </a>
          <div className="pt-4 mt-4 border-t border-slate-200">
            <a href="/network" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-md font-medium text-sm">
              <UserGroupIcon className="w-5 h-5"/>
              Builder Network
            </a>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
    
    
        <header className="bg-white border-b border-slate-200 px-8 pt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Builder Network</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                  type="text" 
                  placeholder="Search skills, bounties..." 
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
                />
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Post Collab Request
              </button>
            </div>
          </div>
          
          <div className="flex gap-8 border-b border-slate-200">
            <button className="pb-3 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">Collab Board</button>
            <button className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900">Component Exchange</button>
            <button className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900">The Arena</button>
          </div>
        </header>

        <div className="p-8 max-w-5xl">
      
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">AK</div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-slate-900">Arjun Kumar</p>
                      <CheckBadgeIcon className="w-4 h-4 text-blue-600"/>
                    </div>
                    <p className="text-xs text-slate-500">Senior AI Automation Architect</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                  50/50 Revenue Split
                </span>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Need Voice AI Dev for Real Estate Bot</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  I just closed a ₹1.2L/mo retainer with a top real estate firm in Mumbai. I have built the core n8n automation and lead qualification logic, but they want an inbound AI voice agent (Bland AI / Vapi) to handle initial calls. Need someone to handle the voice layer.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Bland AI</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Vapi</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Webhooks</span>
                </div>
                <button className="text-blue-600 border border-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                  Message to Collaborate
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">SR</div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-slate-900">Sneha Rao</p>
                      <CheckBadgeIcon className="w-4 h-4 text-blue-600"/>
                    </div>
                    <p className="text-xs text-slate-500">LLM Fine-tuning Specialist</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                  Flat ₹35,000 Bounty
                </span>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Frontend UI needed for Legal Doc Analyzer</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The backend is fully complete. The Python API parses PDFs, compares clauses using Claude 3.5 Sonnet, and returns JSON. I just need a clean Next.js/Tailwind frontend for users to upload files and view the side-by-side analysis.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Next.js</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Tailwind</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">API Integration</span>
                </div>
                <button className="text-blue-600 border border-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                  Message to Collaborate
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}