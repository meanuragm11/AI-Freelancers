"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "@/components/RemoteImage";
import { supabase } from "@/lib/supabaseClient";
import { getServiceById, incrementServiceViews } from "@/lib/services";
import { listPortfolioProjectsByService } from "@/lib/portfolio";
import type { Service, Review, PortfolioProject } from "@/types/marketplace";
import CustomProjectModal from "@/components/CustomProjectModal";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";
import { createCollab } from "@/lib/hire/createCollab";
import SolutionCapabilityBadges from "@/components/solutions/SolutionCapabilityBadges";
import SolutionFulfillmentPreview from "@/components/solutions/SolutionFulfillmentPreview";
import { formatBuilderName } from "@/lib/display/formatBuilderName";
import { fetchBuilderRecognition } from "@/lib/arena/badges/client";
import RecognitionBadgeList from "@/components/arena/RecognitionBadgeList";
import type { RecognitionBadgeGrant } from "@/lib/arena/badges/types";

interface ServicePageProps {
  params: Promise<{ id: string }>;
}

export default function ServiceDetailPage({ params }: ServicePageProps) {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [builderBadges, setBuilderBadges] = useState<RecognitionBadgeGrant[]>([]);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      setServiceId(id);
      try {
        const data = await getServiceById(id);
        if (data.status !== "published") {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || user.id !== data.builder_id) {
            setService(null);
            setLoading(false);
            return;
          }
        }
        setService(data);
        incrementServiceViews(id).catch(() => {});

        try {
          const recognition = await fetchBuilderRecognition(data.builder_id);
          setBuilderBadges(recognition.badges);
        } catch {
          setBuilderBadges([]);
        }

        const [{ data: reviewData }, portfolio] = await Promise.all([
          supabase
            .from("reviews")
            .select("*")
            .eq("service_id", id)
            .order("created_at", { ascending: false })
            .limit(10),
          listPortfolioProjectsByService(id).catch(() => []),
        ]);
        if (reviewData) setReviews(reviewData as Review[]);
        setPortfolioProjects(portfolio);
      } catch {
        setService(null);
      }
      setLoading(false);
    }
    load();
  }, [params]);

  useEffect(() => {
    if (!serviceId) return;
    const channel = supabase
      .channel(`service_${serviceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services", filter: `id=eq.${serviceId}` },
        async () => {
          try {
            const data = await getServiceById(serviceId);
            setService(data);
          } catch {
            /* ignore */
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serviceId]);

  const [ownedInLibrary, setOwnedInLibrary] = useState(false);

  useEffect(() => {
    async function checkLibrary() {
      if (!serviceId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("library")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();
      setOwnedInLibrary(Boolean(data));
    }
    void checkLibrary();
  }, [serviceId]);

  const handleAcquireFreeSolution = async () => {
    if (!service) return;
    setBuying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      const res = await fetch(`/api/solutions/${service.id}/acquire`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Acquisition failed");
      router.push("/buyer/library");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to acquire AI Solution");
    } finally {
      setBuying(false);
    }
  };

  const handleBuyService = async () => {
    if (!service) return;

    const deliveryModel = service.delivery_model ?? "collaborative";
    const pricingMode = service.pricing_mode ?? (Number(service.starting_price_usd) === 0 ? "free" : "paid");

    if (deliveryModel === "instant") {
      if (pricingMode === "free") {
        await handleAcquireFreeSolution();
        return;
      }
      router.push(`/checkout/solution/${service.id}`);
      return;
    }

    setBuying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: existingCollab } = await supabase
        .from("collabs")
        .select("id, status")
        .eq("buyer_id", user.id)
        .eq("builder_id", service.builder_id)
        .eq("service_id", service.id)
        .in("status", ["pending_funding", "funded", "in_progress", "submitted", "disputed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCollab) {
        if (existingCollab.status === "pending_funding") {
          const { data: pendingMilestone } = await supabase
            .from("milestones")
            .select("id")
            .eq("collab_id", existingCollab.id)
            .eq("status", "draft")
            .order("order_index", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (pendingMilestone?.id) {
            router.push(`/checkout/escrow/${pendingMilestone.id}`);
            return;
          }
        }

        router.push(`/collab/${existingCollab.id}`);
        return;
      }

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + service.delivery_time_days);

      const collab = await createCollab({
        buyer_id: user.id,
        builder_id: service.builder_id,
        title: service.title,
        project_description: service.detailed_description || service.short_description || service.title,
        fixed_price_usd: Number(service.starting_price_usd),
        project_deadline: deadline.toISOString().split("T")[0],
        service_id: service.id,
        max_revisions: service.included_revisions,
        extra_revision_price_usd: Number(service.extra_revision_price_usd) || 0,
      });

      const { data: milestone, error } = await supabase
        .from("milestones")
        .insert({
          collab_id: collab.id,
          title: service.title,
          description: service.short_description || "Service delivery",
          amount_usd: Number(service.starting_price_usd),
          order_index: 1,
          due_date: deadline.toISOString(),
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/checkout/escrow/${milestone.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      alert(message);
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading AI Solution...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        AI Solution not found.
      </div>
    );
  }

  const builder = service.builder;
  const builderDisplayName = formatBuilderName(builder?.full_name);
  const banner = service.banner_image_url || service.cover_image_url || builder?.banner_url || "";
  const thumbnail = service.cover_image_url || "";
  const deliveryModel = service.delivery_model ?? "collaborative";
  const pricingMode = service.pricing_mode ?? (Number(service.starting_price_usd) === 0 ? "free" : "paid");
  const isInstant = deliveryModel === "instant";
  const isFree = pricingMode === "free" || Number(service.starting_price_usd) === 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          ← Back to Discover
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-56 bg-slate-100">
            {banner ? (
              <Image src={banner} fill sizes="100vw" className="object-cover" alt={service.title} />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 via-white to-slate-100 text-slate-500 font-black uppercase tracking-widest">
                AI Solution
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
            {builder && (
              <div className="absolute bottom-6 left-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white">
                  {builder.avatar_url ? (
                    <Image src={builder.avatar_url} fill sizes="64px" className="object-cover" alt={builderDisplayName} />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-200 text-slate-500 font-black">
                      {builderDisplayName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-white">
                  <p className="text-xl font-black">{builderDisplayName}</p>
                  <RecognitionBadgeList badges={builderBadges} size="sm" className="mt-1" />
                  <p className="text-sm text-slate-200">{builder.headline}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-8 p-8 lg:grid-cols-[1.6fr_0.8fr]">
            <div className="space-y-8">
              <section>
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                  {service.category || "AI Solution"}
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-900">{service.title}</h1>
                <SolutionCapabilityBadges service={service} className="mt-4" />
                {service.short_description && (
                  <p className="mt-3 text-base font-medium text-slate-700">{service.short_description}</p>
                )}
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {service.detailed_description || service.short_description}
                </p>
              </section>

              {service.requirements_from_buyer && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">Requirements From Buyer</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{service.requirements_from_buyer}</p>
                </section>
              )}

              <SolutionFulfillmentPreview service={service} owned={ownedInLibrary} />

              {portfolioProjects.length > 0 && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">Portfolio Examples</h2>
                  <div className="mt-4 space-y-4">
                    {portfolioProjects.map((project) => (
                      <div key={project.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-slate-900">{project.title}</h3>
                            {project.short_description && (
                              <p className="mt-1 text-sm text-slate-600">{project.short_description}</p>
                            )}
                          </div>
                          {project.project_url && (
                            <a
                              href={project.project_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-black uppercase tracking-widest text-black-600"
                            >
                              View Project
                            </a>
                          )}
                        </div>
                        {project.detailed_description && (
                          <p className="mt-3 text-sm leading-7 text-slate-600">{project.detailed_description}</p>
                        )}
                        {project.media_files?.length > 0 && (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {project.media_files.map((file) => (
                              <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {service.whats_included?.length > 0 && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">What&apos;s Included</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {service.whats_included.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="text-blue-600">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {service.faqs?.length > 0 && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">FAQs</h2>
                  <div className="mt-4 space-y-3">
                    {service.faqs.map((faq) => (
                      <div key={faq.question} className="rounded-2xl border border-slate-200 p-4">
                        <p className="font-black text-slate-900">{faq.question}</p>
                        <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {reviews.length > 0 && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">Reviews</h2>
                  <div className="mt-4 space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-slate-900">Buyer</p>
                          <p className="text-sm text-amber-600">{"★".repeat(Math.round(review.rating))}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{review.review}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {service.gallery_urls?.length > 0 && (
                <section>
                  <h2 className="text-xl font-black text-slate-900">Gallery</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {service.gallery_urls.map((url) => (
                      <div key={url} className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100">
                        <Image src={url} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" alt="Gallery" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              {builder && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Builder</p>
                  <p className="text-lg font-black text-slate-900">{builderDisplayName}</p>
                  <p className="text-sm text-slate-500 mt-1">{builder.headline}</p>
                  <RecognitionBadgeList badges={builderBadges} size="sm" className="mt-3" />
                </div>
              )}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Pricing
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {isFree ? "Free" : `$${Number(service.starting_price_usd).toLocaleString()}`}
                </p>
                {!isInstant && (
                  <>
                    <p className="mt-2 text-sm text-slate-600">
                      Delivery in {service.delivery_time_days} days
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {service.included_revisions} revision(s) included
                      {Number(service.extra_revision_price_usd) > 0 &&
                        ` · Extra revisions $${service.extra_revision_price_usd}`}
                    </p>
                  </>
                )}
                {isInstant && (
                  <p className="mt-2 text-sm text-slate-600">Instant digital delivery after purchase</p>
                )}
                {Number(service.rating_avg) > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-amber-500">★</span>
                    {Number(service.rating_avg).toFixed(1)} · {service.review_count} reviews
                  </div>
                )}
                {ownedInLibrary ? (
                  <button
                    type="button"
                    onClick={() => router.push("/buyer/library")}
                    className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white"
                  >
                    Open in Library
                  </button>
                ) : isInstant && isFree ? (
                  <button
                    type="button"
                    onClick={() => void handleAcquireFreeSolution()}
                    disabled={buying}
                    className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {buying ? "Processing..." : "Acquire Free"}
                  </button>
                ) : isInstant && !isFree ? (
                  <div className="mt-6">
                    <RazorpayCheckoutButton
                      amountUsd={Number(service.starting_price_usd)}
                      itemId={service.id}
                      transactionType="service_purchase"
                      buttonText={`Buy for $${Number(service.starting_price_usd).toLocaleString()}`}
                      redirectPath="/buyer/library"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleBuyService()}
                    disabled={buying}
                    className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {buying ? "Processing..." : "Buy AI Solution"}
                  </button>
                )}
                {!isInstant && (
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(true)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Request Custom Project
                  </button>
                )}
                {builder && (
                  <button
                    type="button"
                    onClick={() => router.push(`/profile/${builder.id}`)}
                    className="mt-3 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View freelancer profile →
                  </button>
                )}
              </div>

              {service.ai_skills?.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-900">Skills</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.ai_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {service.tags?.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-900">Tags</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {thumbnail && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-900">Listing Preview</h3>
                  <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl bg-slate-100">
                    <Image src={thumbnail} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" alt={`${service.title} thumbnail`} />
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {showCustomModal && service && (
        <CustomProjectModal
          builderId={service.builder_id}
          serviceId={service.id}
          builderName={builderDisplayName}
          onClose={() => setShowCustomModal(false)}
          onSuccess={(cid) => router.push(`/buyer/messages?conversation=${cid}`)}
        />
      )}
    </main>
  );
}
