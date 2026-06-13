import React from 'react';
import {
ChatBubbleLeftRightIcon,
ExclamationCircleIcon,
CheckCircleIcon,
ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

export default function BuyerDashboardComplete() {
  return (
    <div className="px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">My AI Stack</h1>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-sm">
          <ExclamationCircleIcon className="w-5 h-5 text-blue-600" />
          <span className="text-slate-700 font-medium">Action required:</span>
          <span className="text-slate-600"> Approve milestone for Legal Parser Bot.</span>
          <button className="ml-2 text-blue-600 font-bold hover:underline">Review</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Active AI Tools</p>
          <p className="text-3xl font-bold text-slate-900">4</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Hired Freelancers</p>
          <p className="text-3xl font-bold text-slate-900">2</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Total Monthly Spend</p>
          <p className="text-3xl font-bold text-slate-900">₹84,500</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Upcoming Renewals</p>
          <p className="text-3xl font-bold text-blue-600">2 in 7 days</p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">
          Subscribed AI Services
        </h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="py-4 px-6 font-medium">Product / Startup</th>
                <th className="py-4 px-6 font-medium">Monthly Cost</th>
                <th className="py-4 px-6 font-medium">Renewal Date</th>
                <th className="py-4 px-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">CS</div>
                    <div>
                      <p className="font-bold text-slate-900">Customer Support Agent AI</p>
                      <p className="text-xs text-slate-500">Nexus Automation</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6 font-medium text-slate-700">₹4,999</td>
                <td className="py-5 px-6 text-slate-600">June 14, 2026</td>
                <td className="py-5 px-6 text-right">
                  <button className="text-blue-600 font-medium hover:underline">Manage Settings</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">IX</div>
                    <div>
                      <p className="font-bold text-slate-900">Invoice Extractor API</p>
                      <p className="text-xs text-slate-500">FinTech Labs</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6 font-medium text-slate-700">₹2,499</td>
                <td className="py-5 px-6 text-slate-600">June 21, 2026</td>
                <td className="py-5 px-6 text-right">
                  <button className="text-blue-600 font-medium hover:underline">Manage Settings</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <h2 className="text-lg font-semibold text-slate-900">Active Freelancer Contracts</h2>
          <a href="/discover" className="text-sm font-medium text-blue-600 hover:underline">Hire new talent</a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="py-4 px-6 font-medium">Freelancer Profile</th>
                <th className="py-4 px-6 font-medium">Project Scope</th>
                <th className="py-4 px-6 font-medium">Milestone Status</th>
                <th className="py-4 px-6 font-medium">Contract Rate</th>
                <th className="py-4 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0">AK</div>
                    <div>
                      <a href="/buyer/freelancers/arjun-kumar" className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group">
                        Arjun Kumar <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <p className="text-xs text-slate-500">AI Automation Architect</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <p className="font-medium text-slate-900">CRM WhatsApp Integration</p>
                  <p className="text-xs text-slate-500">Building custom n8n workflows</p>
                </td>
                <td className="py-5 px-6">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700 font-medium">Phase 2 Delivered</span>
                  </div>
                </td>
                <td className="py-5 px-6 font-medium text-slate-700">₹45,000<span className="text-xs text-slate-500 font-normal">/project</span></td>
                <td className="py-5 px-6">
                  <div className="flex items-center justify-end gap-4">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Message Freelancer">
                      <ChatBubbleLeftRightIcon className="w-6 h-6" />
                    </button>
                    <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                      Contract
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0">SR</div>
                    <div>
                      <a href="/buyer/freelancers/sneha-rao" className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group">
                        Sneha Rao <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <p className="text-xs text-slate-500">LLM Fine-tuning Specialist</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-6">
                  <p className="font-medium text-slate-900">Legal Doc Analyzer Model</p>
                  <p className="text-xs text-slate-500">Monthly Retainer</p>
                </td>
                <td className="py-5 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-slate-700 font-medium">In Progress</span>
                  </div>
                </td>
                <td className="py-5 px-6 font-medium text-slate-700">₹32,000<span className="text-xs text-slate-500 font-normal">/mo</span></td>
                <td className="py-5 px-6">
                  <div className="flex items-center justify-end gap-4">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Message Freelancer">
                      <ChatBubbleLeftRightIcon className="w-6 h-6" />
                    </button>
                    <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                      Contract
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}