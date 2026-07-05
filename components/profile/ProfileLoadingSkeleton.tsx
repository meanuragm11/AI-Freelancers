export default function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-pulse">
      <div className="h-48 bg-slate-200 md:h-72" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="-mt-20 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:-mt-24">
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="h-36 w-36 shrink-0 rounded-3xl bg-slate-200 md:h-44 md:w-44" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
              <div className="h-5 w-1/2 rounded-lg bg-slate-100" />
              <div className="h-4 w-1/3 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-slate-200" />
            <div className="h-64 rounded-2xl bg-slate-100" />
          </div>
          <div className="space-y-6 lg:col-span-2">
            <div className="h-72 rounded-2xl bg-slate-100" />
            <div className="h-72 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
