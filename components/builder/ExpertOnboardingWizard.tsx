"use client";



import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import OnboardingProfileStep from "@/components/builder/OnboardingProfileStep";

import ServiceFormWizard, { SERVICE_WIZARD_STEPS } from "@/components/builder/ServiceFormWizard";

import {

  clearOnboardingProgress,

  loadOnboardingDraft,

  saveOnboardingProfileDraft,

  writeOnboardingProgress,

} from "@/lib/onboarding/draft";

import {

  buildOnboardingServiceInitialForm,

  EMPTY_ONBOARDING_PROFILE,

  ONBOARDING_COUNTRIES,

  profileToDraftPayload,

  validateOnboardingProfileStep,

  type OnboardingProfileState,

} from "@/lib/onboarding/profile";

import type { ServiceFormState } from "@/lib/services/form";

import type { Service } from "@/types/marketplace";

import { supabase } from "@/lib/supabaseClient";



const ONBOARDING_STEPS = [

  { id: 1, label: "Professional Profile" },

  { id: 2, label: "Overview" },

  { id: 3, label: "Pricing" },

  { id: 4, label: "Media" },

  { id: 5, label: "FAQs" },

] as const;



type ExpertOnboardingWizardProps = {

  userId: string;

  initialProfile?: Partial<OnboardingProfileState>;

  onComplete: () => void;

};



export default function ExpertOnboardingWizard({

  userId,

  initialProfile,

  onComplete,

}: ExpertOnboardingWizardProps) {

  const router = useRouter();

  const [step, setStep] = useState(1);

  const [serviceStep, setServiceStep] = useState(1);

  const [profile, setProfile] = useState<OnboardingProfileState>({

    ...EMPTY_ONBOARDING_PROFILE,

    ...initialProfile,

    location: initialProfile?.location || ONBOARDING_COUNTRIES[4],

    tech_stack: initialProfile?.tech_stack || [],

    portfolioProjects: initialProfile?.portfolioProjects || [],

  });

  const [serviceInitialForm, setServiceInitialForm] = useState<ServiceFormState | undefined>();

  const [draftService, setDraftService] = useState<Service | null>(null);

  const [serviceWizardActive, setServiceWizardActive] = useState(false);

  const [draftReady, setDraftReady] = useState(false);

  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const [draftSaved, setDraftSaved] = useState(false);

  const [completing, setCompleting] = useState(false);

  const [published, setPublished] = useState(false);

  const [profileErrors, setProfileErrors] = useState<string[]>([]);



  useEffect(() => {

    let cancelled = false;



    async function restoreDraft() {

      try {

        const draft = await loadOnboardingDraft(userId);

        if (cancelled) return;



        setProfile(draft.profile);



        if (draft.draftService) {

          setDraftService(draft.draftService);

          setServiceInitialForm(

            draft.serviceForm ?? buildOnboardingServiceInitialForm(draft.profile)

          );

          setServiceWizardActive(true);

          setStep(draft.globalStep);

          setServiceStep(draft.serviceStep);

        } else {

          writeOnboardingProgress(userId, 1, 1);

        }

      } catch (err: unknown) {

        console.error("Failed to restore onboarding draft:", err);

      } finally {

        if (!cancelled) setDraftReady(true);

      }

    }



    void restoreDraft();

    return () => {

      cancelled = true;

    };

  }, [userId]);



  useEffect(() => {

    if (!draftReady || step !== 1) return;



    const autoSaveDraft = setTimeout(async () => {

      setIsAutoSaving(true);

      const result = await saveOnboardingProfileDraft(userId, profile);

      if (result.profile) {

        setProfile(result.profile);

      }

      setIsAutoSaving(false);

      setDraftSaved(!result.error);

    }, 1000);



    return () => clearTimeout(autoSaveDraft);

  }, [draftReady, profile, step, userId]);



  const globalProgress = step === 1 ? 1 : serviceStep + 1;



  const stepLabels = useMemo(() => ONBOARDING_STEPS, []);



  const persistProfileDraft = useCallback(async () => {

    setIsAutoSaving(true);

    const result = await saveOnboardingProfileDraft(userId, profile);

    if (result.error) {

      alert(`Failed to save draft: ${result.error}`);

      setIsAutoSaving(false);

      setDraftSaved(false);

      return false;

    }



    if (result.profile) {

      setProfile(result.profile);

    }

    writeOnboardingProgress(userId, 1, 1);

    setIsAutoSaving(false);

    setDraftSaved(true);

    return true;

  }, [profile, userId]);



  const beginServiceSteps = useCallback(async () => {

    const errors = validateOnboardingProfileStep(profile);

    if (errors.length > 0) {

      setProfileErrors(errors);

      return false;

    }

    setProfileErrors([]);

    const saved = await persistProfileDraft();

    if (!saved) return false;

    setServiceInitialForm((current) => current ?? buildOnboardingServiceInitialForm(profile));

    setServiceWizardActive(true);

    setServiceStep(1);

    setStep(2);

    writeOnboardingProgress(userId, 2, 1);

    return true;

  }, [persistProfileDraft, profile, userId]);



  const completeOnboarding = useCallback(

    async (serviceForm?: ServiceFormState) => {

      setCompleting(true);

      try {

        const draftResult = await saveOnboardingProfileDraft(userId, profile);

        if (draftResult.error) throw new Error(draftResult.error);



        const payload = {

          ...profileToDraftPayload(userId, draftResult.profile ?? profile),

          is_freelancer: true,

          base_price_usd: serviceForm?.starting_price_usd ?? 150,

          included_revisions: serviceForm?.included_revisions ?? 1,

          extra_revision_price_usd: serviceForm?.extra_revision_price_usd ?? 25,

          unlimited_revisions: (serviceForm?.included_revisions ?? 1) >= 99,

        };



        const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

        if (error) throw error;



        clearOnboardingProgress(userId);

        onComplete();

        window.scrollTo(0, 0);

      } catch (err: unknown) {

        alert(`Database Sync Error: ${err instanceof Error ? err.message : "Unknown error"}`);

      } finally {

        setCompleting(false);

      }

    },

    [onComplete, profile, userId]

  );



  const handleContinueFromProfile = () => {

    void beginServiceSteps();

  };



  const handleSaveProfileDraft = () => {

    void persistProfileDraft();

  };



  const handleServicePublished = (form: ServiceFormState) => {

    setPublished(true);

    void completeOnboarding(form);

  };



  const handleServiceStepChange = useCallback(

    (nextStep: number) => {

      setServiceStep(nextStep);

      writeOnboardingProgress(userId, 2, nextStep);

    },

    [userId]

  );



  const handleServiceSaved = useCallback(async () => {

    writeOnboardingProgress(userId, 2, serviceStep);

    const draft = await loadOnboardingDraft(userId);

    if (draft.draftService) {

      setDraftService(draft.draftService);

    }

  }, [serviceStep, userId]);



  if (!draftReady) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 font-sans">

        <div className="text-center">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-xs font-black uppercase tracking-widest text-slate-400">

            Restoring your draft...

          </p>

        </div>

      </div>

    );

  }



  return (

    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-16 pb-32 font-sans">

      <div className="pointer-events-none absolute right-[-10%] top-[-10%] -z-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />



      <div className="relative z-10 mx-auto max-w-5xl">

        <button

          type="button"

          onClick={() => router.push("/profile/me")}

          className="mb-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"

        >

          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">

            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />

          </svg>

          Back to Profile

        </button>



        <div className="mb-10 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">

          <div>

            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Become an AI Expert</h1>

            <p className="text-sm font-medium text-slate-500">

              One guided flow from profile to your first published service—ready to sell on Zelance.

            </p>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm">

            {isAutoSaving ? (

              <>

                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />

                Saving...

              </>

            ) : (

              <>

                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                {draftSaved || step > 1 ? "Draft saved" : "Saved"}

              </>

            )}

          </div>

        </div>



        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">

          <div

            className="h-full bg-blue-600 transition-all duration-500 ease-out"

            style={{ width: `${(globalProgress / 5) * 100}%` }}

          />

        </div>



        <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-5">

          {stepLabels.map((item) => {

            const isActive = globalProgress === item.id;

            const isComplete = globalProgress > item.id;

            return (

              <div

                key={item.id}

                className={`rounded-xl px-3 py-2 transition-colors ${

                  isActive

                    ? "bg-blue-600 text-white shadow-md"

                    : isComplete

                      ? "bg-blue-50 text-blue-700"

                      : "bg-white text-slate-500"

                }`}

              >

                <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Step {item.id}</p>

                <p className="text-xs font-black">{item.label}</p>

              </div>

            );

          })}

        </div>



        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {step === 1 ? (

            <>

              <div className="flex-1 p-8 md:p-12">

                {profileErrors.length > 0 && (

                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">

                    {profileErrors.map((error) => (

                      <p key={error} className="text-sm font-medium text-rose-700">

                        {error}

                      </p>

                    ))}

                  </div>

                )}

                <OnboardingProfileStep builderId={userId} profile={profile} onChange={setProfile} />

              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5 md:px-12">

                <button

                  type="button"

                  disabled={isAutoSaving}

                  onClick={handleSaveProfileDraft}

                  className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"

                >

                  {isAutoSaving ? "Saving..." : "Save Draft"}

                </button>

                <button

                  type="button"

                  onClick={handleContinueFromProfile}

                  className="rounded-xl bg-slate-900 px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-600"

                >

                  Continue to Service Listing

                </button>

              </div>

            </>

          ) : (

            <>

              <div className="border-b border-slate-100 px-6 py-5 md:px-8">

                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">

                  Step {globalProgress} · {ONBOARDING_STEPS[globalProgress - 1]?.label}

                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">Create Your First Service</h2>

                <p className="mt-1 text-sm text-slate-500">

                  Same listing flow as your workspace—overview, pricing, media, and FAQs in one continuous wizard. Portfolio projects from step 1 are saved to your profile.

                </p>

              </div>



              {published && (

                <div className="mx-6 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 md:mx-8">

                  Your first service is published. Finishing expert profile setup...

                </div>

              )}



              <div className="flex min-h-0 flex-1 flex-col px-2 md:px-4">

                <ServiceFormWizard

                  builderId={userId}

                  editingService={draftService}

                  embedded

                  hideStepNav

                  stepNumberOffset={1}

                  active={serviceWizardActive}

                  initialForm={serviceInitialForm}

                  initialStep={serviceStep}

                  onStepChange={handleServiceStepChange}

                  onSaved={() => {

                    void handleServiceSaved();

                  }}

                  onExitFirstStep={() => {

                    setServiceWizardActive(false);

                    setStep(1);

                    writeOnboardingProgress(userId, 1, 1);

                  }}

                  onPublished={handleServicePublished}

                />

              </div>

            </>

          )}

        </div>



        {step > 1 && SERVICE_WIZARD_STEPS[serviceStep - 1] && (

          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">

            {completing

              ? "Activating your expert profile..."

              : "Publish your service on the final step to unlock your builder workspace."}

          </p>

        )}

      </div>

    </div>

  );

}


