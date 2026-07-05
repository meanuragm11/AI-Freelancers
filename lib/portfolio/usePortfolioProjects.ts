"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listPortfolioProjects } from "@/lib/portfolio";
import type { PortfolioProject } from "@/types/marketplace";

type UsePortfolioProjectsOptions = {
  serviceId?: string;
  enabled?: boolean;
};

export function usePortfolioProjects(
  builderId: string | undefined,
  options: UsePortfolioProjectsOptions = {}
) {
  const { serviceId, enabled = true } = options;
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!builderId || !enabled) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await listPortfolioProjects(builderId, serviceId);
      setProjects(data);
    } catch (error) {
      console.error("Failed to load portfolio projects:", error);
    } finally {
      setLoading(false);
    }
  }, [builderId, enabled, serviceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!builderId || !enabled) return;

    const channelName = `portfolio_projects_${builderId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_projects",
          filter: `builder_id=eq.${builderId}`,
        },
        () => {
          void reload();
        }
      )
      .subscribe();

    const refetchOnFocus = () => {
      if (document.visibilityState === "visible") {
        void reload();
      }
    };

    window.addEventListener("focus", refetchOnFocus);
    window.addEventListener("visibilitychange", refetchOnFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", refetchOnFocus);
      window.removeEventListener("visibilitychange", refetchOnFocus);
    };
  }, [builderId, enabled, reload]);

  return { projects, loading, reload };
}
