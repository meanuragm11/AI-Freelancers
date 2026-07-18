"use client";

import React, { useState } from 'react';
interface ReviewModalProps {
  collabId: string;
  builderId: string;
  builderName: string;
  serviceId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ collabId, builderId, builderName, serviceId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collabId,
          builderId,
          serviceId,
          rating,
          review: feedback,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit review');
      
      onSuccess();
    } catch (err: unknown) {
      setErrorMessage("Failed to submit review: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95">
        
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">Contract Complete</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Rate {builderName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Star Rating System */}
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Overall Experience</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <svg 
                    className={`w-10 h-10 transition-colors duration-200 ${
                      star <= (hoverRating || rating) 
                        ? 'text-amber-400 fill-current drop-shadow-md' 
                        : 'text-slate-200 fill-current'
                    }`} 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="h-4 mt-2">
              {rating > 0 && (
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-in fade-in">
                  {['Poor', 'Fair', 'Good', 'Excellent', 'Exceptional'][rating - 1]}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              Public Testimonial (Optional)
            </label>
            <textarea 
              rows={4} 
              value={feedback} 
              onChange={(e) => setFeedback(e.target.value)} 
              placeholder="How was the communication, delivery, and code quality?" 
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none shadow-inner" 
            />
          </div>

          <div className="pt-2">
            {errorMessage && (
              <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {errorMessage}
              </p>
            )}
            <button 
              type="submit" 
              disabled={submitting || rating === 0} 
              className="w-full bg-slate-900 disabled:bg-slate-300 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-blue-600 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}