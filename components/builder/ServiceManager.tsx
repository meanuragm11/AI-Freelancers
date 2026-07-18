"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  archiveService,
  duplicateService,
  getServiceByIdForBuilder,
  listBuilderServices,
  restoreService,
  setServiceStatus,
} from "@/lib/services";
import { listPortfolioProjectsByService } from "@/lib/portfolio";
import { serviceToFormState, validateServiceForm } from "@/lib/services/form";
import { supabase } from "@/lib/supabaseClient";
import type { Service } from "@/types/marketplace";
import BuilderServiceCard from "@/components/builder/BuilderServiceCard";
import ServiceFormModal from "@/components/builder/ServiceFormModal";

export default function ServiceManager({ builderId }: { builderId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [initialForm, setInitialForm] = useState<ReturnType<typeof serviceToFormState> | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBuilderServices(builderId);
      setServices(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [builderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`builder_services_${builderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services", filter: `builder_id=eq.${builderId}` },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [builderId, load]);

  const openCreateModal = () => {
    setEditingService(null);
    setInitialForm(undefined);
    setModalOpen(true);
    setErrorMessage(null);
  };

  const openEditModal = async (service: Service) => {
    setBusyId(service.id);
    setErrorMessage(null);
    try {
      const [fullService, portfolioProjects] = await Promise.all([
        getServiceByIdForBuilder(service.id, builderId),
        listPortfolioProjectsByService(service.id),
      ]);
      setEditingService(fullService);
      setInitialForm(
        serviceToFormState(
          fullService,
          portfolioProjects.map((project) => project.id)
        )
      );
      setModalOpen(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load service details");
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (service: Service) => {
    setBusyId(service.id);
    setErrorMessage(null);
    try {
      await duplicateService(service.id, builderId);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to duplicate service");
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublish = async (service: Service) => {
    setBusyId(service.id);
    setErrorMessage(null);
    try {
      if (service.status === "published") {
        await setServiceStatus(service.id, "paused");
      } else {
        const form = serviceToFormState(service);
        const validation = validateServiceForm(form, "publish");
        if (!validation.valid) {
          setErrorMessage(validation.errors.join(" "));
          await openEditModal(service);
          return;
        }
        await setServiceStatus(service.id, "published");
      }
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update service status");
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (service: Service) => {
    if (
      !window.confirm(
        `Archive "${service.title}"? It will be removed from the marketplace immediately, but any active or completed orders, buyer messages, and reviews for it are kept.`
      )
    )
      return;
    setBusyId(service.id);
    setErrorMessage(null);
    try {
      await archiveService(service.id);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to archive service");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (service: Service) => {
    setBusyId(service.id);
    setErrorMessage(null);
    try {
      await restoreService(service.id);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to restore service");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">My AI Solutions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage freelance services, digital downloads, and ready-to-use AI solutions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-700"
        >
          + Create AI Solution
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] animate-pulse rounded-3xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <p className="text-lg font-black text-slate-900">No AI Solutions yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Create your first AI Solution to appear on Discover, search, and your public profile.
            One listing can include expertise, downloads, customization, and implementation.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white"
          >
            + Create AI Solution
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <BuilderServiceCard
              key={service.id}
              service={service}
              busy={busyId === service.id}
              onEdit={() => void openEditModal(service)}
              onDuplicate={() => void handleDuplicate(service)}
              onTogglePublish={() => void handleTogglePublish(service)}
              onArchive={() => void handleArchive(service)}
              onRestore={() => void handleRestore(service)}
            />
          ))}
        </div>
      )}

      <ServiceFormModal
        builderId={builderId}
        open={modalOpen}
        editingService={editingService}
        initialForm={initialForm}
        onClose={() => {
          setModalOpen(false);
          setEditingService(null);
          setInitialForm(undefined);
        }}
        onSaved={() => {
          void load();
        }}
      />
    </div>
  );
}
