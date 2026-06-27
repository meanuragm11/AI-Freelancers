"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface WorkSegment {
  id: string;
  segment_start: string;
  segment_end: string;
  keystroke_count: number;
  mouse_click_count: number;
  active_window_title: string;
  screenshot_url: string;
  is_offline_cached: boolean;
  is_disputed: boolean;
}

interface GroupedHour {
  hourLabel: string;
  segments: WorkSegment[];
}

export default function BuyerWorkDiary() {
  const params = useParams();
  const collabId = params?.id as string;

  const [diaryGroups, setDiaryGroups] = useState<GroupedHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [totalBilledHours, setTotalBilledHours] = useState("0.0");

  useEffect(() => {
    if (!collabId) return;

    async function fetchWorkDiary() {
      setLoading(true);
      
      // Fetch segments for the specific contract instance ordered chronologically
      const { data, error } = await supabase
        .from('work_diaries')
        .select('*')
        .eq('collab_id', collabId)
        .order('segment_start', { ascending: false });

      if (!error && data) {
        const segments = data as WorkSegment[];
        
        // Calculate total hours based on completed 10-minute segments
        const calculatedHours = (segments.length * 10) / 60;
        setTotalBilledHours(calculatedHours.toFixed(1));

        // Group segments by their respective hour blocks for the UI timeline loop
        const groups: { [key: string]: WorkSegment[] } = {};
        
        segments.forEach(seg => {
          const dateObj = new Date(seg.segment_start);
          const timeLabel = dateObj.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          // Extract just the hour bucket (e.g., "03:00 PM")
          const hourBucket = timeLabel.replace(/:[0-9]{2}/, ':00');
          
          if (!groups[hourBucket]) {
            groups[hourBucket] = [];
          }
          groups[hourBucket].push(seg);
        });

        const formattedGroups = Object.keys(groups).map(hour => ({
          hourLabel: hour,
          segments: groups[hour].sort((a, b) => 
            new Date(a.segment_start).getTime() - new Date(b.segment_start).getTime()
          )
        }));

        setDiaryGroups(formattedGroups);
      }
      setLoading(false);
    }

    fetchWorkDiary();
  }, [collabId]);

  const toggleDisputeSegment = async (segmentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('work_diaries')
      .update({ is_disputed: !currentStatus })
      .eq('id', segmentId);

    if (!error) {
      // Optimizely refresh internal local state array matching modifications
      setDiaryGroups(prev => prev.map(group => ({
        ...group,
        segments: group.segments.map(seg => 
          seg.id === segmentId ? { ...seg, is_disputed: !currentStatus } : seg
        )
      })));
    }
  };

  // Helper calculation to establish green/yellow/red activity tiers
  const getActivityLevel = (keys: number, clicks: number) => {
    const total = keys + clicks;
    if (total > 300) return { width: 'w-full', color: 'bg-emerald-500', label: 'High Activity' };
    if (total > 50) return { width: 'w-1/2', color: 'bg-amber-500', label: 'Moderate Activity' };
    return { width: 'w-2', color: 'bg-rose-500', label: 'Idle / Render Block' };
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      
      {/* Header Info Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Work Diary</h1>
          <p className="text-slate-500 text-sm font-medium">
            Review granular 10-minute hardware activity levels, application tracking, and automated screenshots.
          </p>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-8 self-start md:self-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Logged This Cycle</p>
            <p className="text-2xl font-black text-slate-900">{totalBilledHours} hrs</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Verification Mode</p>
            <p className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span> Hybrid Engine Active
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Processing Loop */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 border border-slate-200 rounded-3xl bg-white">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling Timesheet Records...</p>
        </div>
      ) : diaryGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <p className="text-base font-black text-slate-800 mb-1">No tracked time found for this cycle</p>
          <p className="text-sm text-slate-500 font-medium">Logs will appear automatically once the builder starts the desktop tracker engine.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {diaryGroups.map((group, gIdx) => (
            <div key={gIdx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              
              {/* Hourly block marker label */}
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{group.hourLabel}</h3>
              </div>

              {/* 10-Minute Segments Horizontal Grid Array Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {group.segments.map((segment) => {
                  const activity = getActivityLevel(segment.keystroke_count, segment.mouse_click_count);
                  
                  return (
                    <div 
                      key={segment.id} 
                      className={`border rounded-2xl p-3 flex flex-col group/card transition-all relative overflow-hidden ${
                        segment.is_disputed 
                          ? 'border-rose-300 bg-rose-50/30' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Interactive Visual Screenshot Container Block */}
                      <div 
                        onClick={() => setSelectedScreenshot(segment.screenshot_url)}
                        className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-3 relative overflow-hidden cursor-zoom-in group/img"
                      >
                        <img 
                          src={segment.screenshot_url} 
                          alt="Desktop Capture Output" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] font-black uppercase text-white tracking-widest bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                            Expand View
                          </span>
                        </div>
                      </div>

                      {/* Foreground Window Identification Meta String */}
                      <p className="text-xs font-bold text-slate-800 truncate mb-2" title={segment.active_window_title}>
                        {segment.active_window_title}
                      </p>

                      {/* Micro Metric Activity Visual Bars Representation */}
                      <div className="mt-auto pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Activity</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">
                            {segment.keystroke_count + segment.mouse_click_count} actions
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${activity.color} ${activity.width} rounded-full`}></div>
                        </div>
                      </div>

                      {/* Context Menu Flag Action Panel Controls */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleDisputeSegment(segment.id, segment.is_disputed)}
                          className={`p-1.5 rounded-lg shadow-md border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            segment.is_disputed
                              ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200'
                          }`}
                          title={segment.is_disputed ? "Remove flag from this segment" : "Flag / Dispute this segment"}
                        >
                          {segment.is_disputed ? 'Flagged' : 'Flag'}
                        </button>
                      </div>
                      
                      {/* Offline Badge Notification Element */}
                      {segment.is_offline_cached && (
                        <div className="absolute bottom-16 left-4">
                          <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
                            Offline Cached
                          </span>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal Structure for Detailed Screenshot Analysis */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="max-w-5xl w-full bg-white border border-slate-800 p-2 rounded-3xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <img 
              src={selectedScreenshot} 
              alt="High Res Inspection Block View" 
              className="w-full h-auto rounded-2xl shadow-inner"
            />
            <button 
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              Close Overlay ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}