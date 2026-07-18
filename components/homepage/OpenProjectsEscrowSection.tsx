"use client";

import Link from "next/link";
import {
  BriefcaseIcon,
  InboxArrowDownIcon,
  UserPlusIcon,
  BanknotesIcon,
  LockClosedIcon,
  ComputerDesktopIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const WORKFLOW_STEPS = [
  {
    title: "Post Project",
    label: "Define scope",
    icon: BriefcaseIcon,
  },
  {
    title: "Receive Proposals",
    label: "Compare offers",
    icon: InboxArrowDownIcon,
  },
  {
    title: "Hire Expert",
    label: "Pick your match",
    icon: UserPlusIcon,
  },
  {
    title: "Release Payment",
    label: "Escrow protected",
    icon: BanknotesIcon,
  },
] as const;

function EscrowIllustration() {
  return (
    <div
      className="relative w-full max-w-sm mx-auto md:mx-0"
      aria-hidden="true"
    >
      <div className="absolute -inset-4 bg-gradient-to-br from-blue-50 via-white to-slate-50 rounded-3xl blur-2xl opacity-80" />

      <div className="relative bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between gap-3">
          {/* Buyer */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Client
            </span>
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 shadow-sm flex items-center justify-center">
              <BriefcaseIcon className="w-6 h-6 text-slate-600" strokeWidth={1.75} />
            </div>
          </div>

          {/* Flow line 1 */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-[2.5rem]">
            <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-slate-200 to-blue-400 rounded-full animate-[pulse_2.5s_ease-in-out_infinite]" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
              Fund
            </span>
          </div>

          {/* Escrow Lock — center focal point */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Escrow Lock
            </span>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur-md scale-110" />
              <div className="relative w-[4.5rem] h-[4.5rem] rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500/30 shadow-[0_4px_24px_-4px_rgba(59,130,246,0.35)] flex items-center justify-center">
                <LockClosedIcon className="w-7 h-7 text-blue-600" strokeWidth={1.75} />
              </div>
            </div>
          </div>

          {/* Flow line 2 */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-[2.5rem]">
            <div className="h-0.5 w-full bg-slate-100 rounded-full" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
              Release
            </span>
          </div>

          {/* Builder */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              AI Expert
            </span>
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 shadow-sm flex items-center justify-center">
              <ComputerDesktopIcon className="w-6 h-6 text-slate-600" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Funds held securely until delivery
          </span>
        </div>
      </div>
    </div>
  );
}

function WorkflowSteps() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === WORKFLOW_STEPS.length - 1;

        return (
          <div key={step.title} className="relative group">
            {!isLast && (
              <div
                className="hidden lg:block absolute top-7 left-[calc(50%+1.75rem)] w-[calc(100%-3.5rem+0.75rem)] h-px bg-gradient-to-r from-slate-200 to-slate-100 z-0"
                aria-hidden="true"
              />
            )}

            <div className="relative z-10 flex flex-col items-center text-center p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-blue-200/60 hover:bg-white hover:shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] transition-all duration-300 h-full">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mb-3 group-hover:border-blue-200 group-hover:shadow-md transition-all duration-300">
                <Icon className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-black text-slate-900 tracking-tight leading-tight mb-1">
                {step.title}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OpenProjectsEscrowSection() {
  return (
    <section
      className="mt-6 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_4px_32px_-8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_48px_-12px_rgba(15,23,42,0.12)] transition-shadow duration-500"
      aria-labelledby="open-projects-escrow-heading"
    >
      <div className="p-8 md:p-12 lg:p-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-100">
                Secure Hiring
              </div>
              <h3
                id="open-projects-escrow-heading"
                className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-4"
              >
                Open Projects &amp; Secure Escrow
              </h3>
              <p className="text-slate-500 font-medium text-base leading-relaxed max-w-lg">
                Post your AI project, receive competitive proposals from top AI
                freelancers &amp; hire the perfect AI expert.
              </p>
            </div>

            <WorkflowSteps />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-7 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 shadow-sm hover:shadow-md"
              >
                Post Project
                <ArrowRightIcon className="w-4 h-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-7 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300"
              >
                Open Projects
                <ArrowRightIcon className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* Illustration */}
          <EscrowIllustration />
        </div>
      </div>
    </section>
  );
}
