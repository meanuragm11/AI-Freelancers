"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { EarningsLedgerSummary } from "@/lib/builder/earningsLedger";

export function useEarningsLedger() {
  const [ledger, setLedger] = useState<EarningsLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderId, setBuilderId] = useState<string | null>(null);

  const loadLedger = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/builder/earnings");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load earnings ledger");
      setLedger(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load earnings ledger");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveBuilder() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setBuilderId(user?.id ?? null);
    }

    void resolveBuilder();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  useEffect(() => {
    if (!builderId) return;

    const channelName = `builder_earnings_${builderId}`;
    const tables = [
      { table: "escrow_transactions", filter: `builder_id=eq.${builderId}` },
      { table: "builder_withdrawals", filter: `builder_id=eq.${builderId}` },
      { table: "invoices", filter: `builder_id=eq.${builderId}` },
      { table: "collabs", filter: `builder_id=eq.${builderId}` },
      { table: "components", filter: `builder_id=eq.${builderId}` },
      { table: "builder_payout_methods", filter: `builder_id=eq.${builderId}` },
    ] as const;

    let channel = supabase.channel(channelName);
    for (const { table, filter } of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        () => {
          void loadLedger({ silent: true });
        }
      );
    }
    channel.subscribe();

    const refetchOnFocus = () => {
      if (document.visibilityState === "visible") {
        void loadLedger({ silent: true });
      }
    };

    window.addEventListener("focus", refetchOnFocus);
    window.addEventListener("visibilitychange", refetchOnFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", refetchOnFocus);
      window.removeEventListener("visibilitychange", refetchOnFocus);
    };
  }, [builderId, loadLedger]);

  return { ledger, loading, error, setError, reload: loadLedger };
}
