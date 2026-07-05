"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Type configuration for Tauri global window API
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
    };
  }
}

interface TrackerProps {
  collabId: string;
  builderId: string;
}

export default function TrackerEngine({ collabId, builderId }: TrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentHourMins, setCurrentHourMins] = useState("00:00");
  const [currentSegmentActivity, setCurrentSegmentActivity] = useState({ keys: 0, clicks: 0 });
  
  // High-precision references for real-time operating parameters
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputLogs = useRef({ keystrokes: 0, mouseClicks: 0 });
  const segmentDurationSec = useRef(0);
  const segmentLimitSec = 600; // Exact 10-minute tracking segments (Upwork standard)

  // Native bridge hook to talk to the underlying Rust layer
  const invokeTauri = async (cmd: string, args = {}) => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        return await window.__TAURI__.invoke(cmd, args);
      } catch (err) {
        console.error(`Tauri Core Invoke Error [${cmd}]:`, err);
        return null;
      }
    }
    // Web fallback mockup simulation for dev environments
    if (cmd === 'capture_desktop_screen') return null;
    return { success: true };
  };

  const startTracking = async () => {
    setIsTracking(true);
    inputLogs.current = { keystrokes: 0, mouseClicks: 0 };
    segmentDurationSec.current = 0;

    // Direct initialization to native listeners
    await invokeTauri('initialize_global_listeners');

    intervalRef.current = setInterval(async () => {
      segmentDurationSec.current += 1;

      // Every 1 second, fetch raw hardware tracking ticks from the OS background layer
      const hardwareTicks = await invokeTauri('poll_hardware_inputs');
      if (hardwareTicks) {
        inputLogs.current.keystrokes += hardwareTicks.keys || 0;
        inputLogs.current.mouseClicks += hardwareTicks.clicks || 0;
      }

      // Update real-time component UI counters
      setCurrentSegmentActivity({
        keys: inputLogs.current.keystrokes,
        clicks: inputLogs.current.mouseClicks
      });

      // Update UI timestamp layout clock representation
      const displayMins = Math.floor(segmentDurationSec.current / 60).toString().padStart(2, '0');
      const displaySecs = (segmentDurationSec.current % 60).toString().padStart(2, '0');
      setCurrentHourMins(`${displayMins}:${displaySecs}`);

      // Segment completed: Dispatch segment payload data structure immediately
      if (segmentDurationSec.current >= segmentLimitSec) {
        await finalizeSegmentWindow();
      }
    }, 1000);
  };

  const stopTracking = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsTracking(false);
    await invokeTauri('teardown_global_listeners');
    await finalizeSegmentWindow();
  };

  const finalizeSegmentWindow = async () => {
    if (segmentDurationSec.current === 0) return;

    const segmentStart = new Date(Date.now() - segmentDurationSec.current * 1000).toISOString();
    const segmentEnd = new Date().toISOString();
    
    // Request an instant desktop capture screenshot from the platform engine
    const screenshotAssetUrl = await invokeTauri('capture_desktop_screen');
    const activeWindowInfo = await invokeTauri('get_foreground_window_title') || "Unknown Workspace";

    const payload = {
      collab_id: collabId,
      builder_id: builderId,
      segment_start: segmentStart,
      segment_end: segmentEnd,
      keystroke_count: inputLogs.current.keystrokes,
      mouse_click_count: inputLogs.current.mouseClicks,
      active_window_title: activeWindowInfo,
      screenshot_url: screenshotAssetUrl,
      is_offline_cached: !navigator.onLine
    };

    if (navigator.onLine) {
      // Direct push to Cloud Supabase Infrastructure
      const { error } = await supabase.from('work_diaries').insert([payload]);
      if (error) {
        console.warn("Supabase ingestion failed, falling back to local storage cache.");
        await invokeTauri('cache_segment_locally', { data: payload });
      }
    } else {
      // Offline mode: Cache securely into local embedded Tauri SQLite DB
      await invokeTauri('cache_segment_locally', { data: payload });
    }

    // Clear buffer reference nodes safely for next processing loop
    inputLogs.current = { keystrokes: 0, mouseClicks: 0 };
    segmentDurationSec.current = 0;
  };

  // Automated background processing daemon syncing local database items online
  useEffect(() => {
    const syncOnlineDaemon = async () => {
      if (navigator.onLine) {
        const localCachedSegments = await invokeTauri('fetch_local_sqlite_cache');
        if (localCachedSegments && localCachedSegments.length > 0) {
          const { error } = await supabase.from('work_diaries').insert(localCachedSegments);
          if (!error) {
            await invokeTauri('clear_local_sqlite_cache');
          }
        }
      }
    };

    window.addEventListener('online', syncOnlineDaemon);
    return () => window.removeEventListener('online', syncOnlineDaemon);
  }, []);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Metric Diagnostics Block */}
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <svg className={`h-6 w-6 ${isTracking ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{currentHourMins}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Segment</span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Inputs captured: <span className="text-slate-700">{currentSegmentActivity.keys} keys</span> • <span className="text-slate-700">{currentSegmentActivity.clicks} clicks</span>
            </p>
          </div>
        </div>

        {/* Dynamic Action Trigger Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isTracking ? (
            <button
              onClick={stopTracking}
              className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-rose-600/10"
            >
              Stop Tracker
            </button>
          ) : (
            <button
              onClick={startTracking}
              className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-slate-900/10"
            >
              Start Tracker
            </button>
          )}
        </div>

      </div>
    </div>
  );
}