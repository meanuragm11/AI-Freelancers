"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function UploadComponent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isFree, setIsFree] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [assetFile, setAssetFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Generative Prompts',
    custom_category: '', 
    description: '',
    price_usd: 2, 
    delivery_method: 'secure_text',
    secure_payload_text: '',
    license_type: 'Standard Commercial',
  });

  const categories = [
    'Generative Prompts',
    'Autonomous Agents',
    'RAG Architectures',
    'Fine-Tuned Models',
    'Computer Vision',
    'UI/UX AI Assets',
    'Data Pipelines',
    'Other'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const platformFee = formData.price_usd >= 20 ? 5 : 1;
  const netPayout = formData.price_usd - platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isFree && formData.price_usd < 2) {
      alert("Premium assets must be priced at $2 or higher to cover the minimum $1 platform fee.");
      setLoading(false);
      return;
    }

    if (formData.delivery_method === 'file_upload' && !assetFile) {
      alert("Please upload your .ZIP or .PDF asset file.");
      setLoading(false);
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const builderId = user?.id || '00000000-0000-0000-0000-000000000000';

      const finalPriceUsd = isFree ? 0 : formData.price_usd;
      const finalPriceInr = Math.round(finalPriceUsd * 83.50); 
      const finalCategory = formData.category === 'Other' ? formData.custom_category : formData.category;
      const mockThumbnailUrl = thumbnailPreview || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600&h=350';

      // --- NEW: AI Vector Generation ---
      const textToEmbed = `${formData.title}. ${finalCategory}. ${formData.description}`;
      let embeddingArray = null;

      try {
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToEmbed })
        });

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          embeddingArray = embedData.embedding;
        }
      } catch (embedError) {
        console.warn("Failed to generate embedding during upload, saving without vector:", embedError);
      }
      // ---------------------------------

      const { error: insertError } = await supabase
        .from('components')
        .insert([{
          builder_id: builderId,
          title: formData.title,
          description: formData.description,
          category: finalCategory,
          price_usd: finalPriceUsd,
          price_inr: finalPriceInr,
          thumbnail_url: mockThumbnailUrl, 
          delivery_method: formData.delivery_method,
          secure_payload_text: formData.delivery_method === 'secure_text' ? formData.secure_payload_text : null,
          license_type: formData.license_type,
          embedding: embeddingArray // Injecting the math vector here
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/builder/arena'); 
      }, 2000);

    } catch (error: any) {
      alert("Deployment Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xl max-w-lg w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Component Published!</h2>
          <p className="text-slate-500 font-medium mb-8">Your component is now live on the global exchange and your Arena ranking has been updated.</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full w-full animate-[pulse_1s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-4">
            Zelance Component Exchange
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Deploy an Asset</h1>
          <p className="text-slate-500 font-medium text-lg">Monetize your AI architectures, prompts, and models directly to enterprise buyers.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-black text-slate-900">1. Discovery Metadata</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">This information is public and optimized for the search engine.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Component Title</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g., Enterprise RAG Pipeline using Pinecone"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Primary Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors appearance-none cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {formData.category === 'Other' && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <input 
                      required 
                      type="text" 
                      placeholder="Please specify your category..."
                      value={formData.custom_category}
                      onChange={(e) => setFormData({...formData, custom_category: e.target.value})}
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors shadow-sm" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Technical Description</label>
              <textarea 
                required 
                rows={4}
                placeholder="Detail the stack, requirements, and what problem this component solves..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors resize-none" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Thumbnail Image</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 bg-slate-50 border border-slate-200 hover:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 outline-none transition-colors cursor-pointer flex justify-between items-center group">
                  <span className="truncate">{thumbnailFile ? thumbnailFile.name : 'Upload a display image (JPG, PNG)...'}</span>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
                {thumbnailPreview && (
                  <div className="w-20 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="border-b border-slate-100 pb-4 mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">2. Secure Fulfillment Payload</h2>
                <span className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Paywall Locked 🔒</span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-1">This is automatically delivered to the buyer ONLY after a successful transaction.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <button 
                type="button"
                onClick={() => setFormData({...formData, delivery_method: 'secure_text'})}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.delivery_method === 'secure_text' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <h3 className={`text-sm font-black mb-1 ${formData.delivery_method === 'secure_text' ? 'text-blue-700' : 'text-slate-700'}`}>Secure Text / URL</h3>
                <p className="text-xs font-medium text-slate-500">Best for Prompts, API Keys, or private GitHub links.</p>
              </button>
              
              <button 
                type="button"
                onClick={() => setFormData({...formData, delivery_method: 'file_upload'})}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.delivery_method === 'file_upload' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <h3 className={`text-sm font-black mb-1 ${formData.delivery_method === 'file_upload' ? 'text-blue-700' : 'text-slate-700'}`}>Digital Download</h3>
                <p className="text-xs font-medium text-slate-500">Best for Jupyter Notebooks, ZIP source code, or Models.</p>
              </button>
            </div>

            {formData.delivery_method === 'secure_text' ? (
              <div className="relative z-10">
                <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 block">Locked Content</label>
                <textarea 
                  required 
                  rows={5}
                  placeholder="Paste your exact prompt sequence, or the URL to your private repository..."
                  value={formData.secure_payload_text}
                  onChange={(e) => setFormData({...formData, secure_payload_text: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-mono text-amber-500 outline-none transition-colors resize-none placeholder:text-slate-600" 
                />
              </div>
            ) : (
              <label className="relative z-10 border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all cursor-pointer group block">
                <input 
                  type="file" 
                  accept=".zip,.pdf,.tar.gz,.rar"
                  onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                  className="hidden" 
                />
                <div className={`w-14 h-14 rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 transition-all ${assetFile ? 'bg-green-100' : 'bg-white group-hover:scale-110'}`}>
                  {assetFile ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : (
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  )}
                </div>
                <p className={`text-sm font-black ${assetFile ? 'text-green-700' : 'text-slate-700'}`}>
                  {assetFile ? assetFile.name : 'Click to select .ZIP or .PDF asset'}
                </p>
                {!assetFile && <p className="text-xs font-medium text-slate-500 mt-2">Maximum file size 500MB via Supabase Storage.</p>}
                {assetFile && <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-2">File ready for encryption</p>}
              </label>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
             <div className="border-b border-slate-100 pb-4 mb-6 relative z-10">
              <h2 className="text-lg font-black text-slate-900">3. Commercial Strategy</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                onClick={() => { setIsFree(true); setFormData({...formData, price_usd: 0, license_type: 'MIT (Open Source)'}); }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${isFree ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <h3 className={`text-sm font-black mb-1 ${isFree ? 'text-green-700' : 'text-slate-700'}`}>Open-Source (Free)</h3>
                <p className="text-xs font-medium text-slate-500">Give back to the mesh. Buyers can acquire your asset instantly. Boosts your Arena ranking fast.</p>
              </div>

              <div 
                onClick={() => { setIsFree(false); setFormData({...formData, price_usd: 2, license_type: 'Standard Commercial'}); }}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${!isFree ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <h3 className={`text-sm font-black mb-1 ${!isFree ? 'text-blue-700' : 'text-slate-700'}`}>Premium Asset (Paid)</h3>
                <p className="text-xs font-medium text-slate-500">Monetize your code. Payments route securely through Razorpay directly to your account.</p>
              </div>
            </div>

            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Asset License</label>
              <select 
                value={formData.license_type}
                onChange={(e) => setFormData({...formData, license_type: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors appearance-none cursor-pointer"
              >
                {isFree ? (
                  <>
                    <option value="MIT (Open Source)">MIT (Open Source)</option>
                    <option value="Apache 2.0">Apache 2.0</option>
                    <option value="CC BY 4.0">CC BY 4.0</option>
                  </>
                ) : (
                  <>
                    <option value="Standard Commercial">Standard Commercial</option>
                    <option value="Extended Commercial">Extended Commercial</option>
                    <option value="Private Use Only">Private Use Only</option>
                  </>
                )}
              </select>
            </div>

            {!isFree && (
              <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Asset Price (USD)</label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">$</span>
                  <input 
                    required 
                    type="number" 
                    min="2"
                    step="1"
                    value={formData.price_usd}
                    onChange={(e) => setFormData({...formData, price_usd: Number(e.target.value)})}
                    className="w-full bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-4 text-2xl font-black text-slate-900 outline-none transition-colors shadow-sm" 
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                   <div>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                       Platform Fee ({formData.price_usd >= 20 ? 'Standard Tier' : 'Micro Tier'})
                     </p>
                     <p className="text-sm font-black text-rose-500">-${platformFee}.00</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Your Net Payout</p>
                     <p className="text-sm font-black text-green-600">${Math.max(0, netPayout).toFixed(2)}</p>
                   </div>
                </div>

                {formData.price_usd < 2 && (
                  <p className="text-[10px] font-bold text-rose-500 mt-3 flex items-center gap-1 uppercase tracking-widest">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Minimum price is $2 to cover the micro-tier fee.
                  </p>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || (!isFree && formData.price_usd < 2)}
              className={`w-full text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isFree ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-blue-600'}`}
            >
              {loading ? 'Processing...' : 'Publish Component'}
            </button>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mt-6">
              Platform Fee Model: $1 fee for components under $20. $5 fee for components $20 and above. Open-source components incur $0 fees.
            </p>

          </div>

        </form>
      </div>
    </div>
  );
}