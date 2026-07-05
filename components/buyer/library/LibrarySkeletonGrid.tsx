export default function LibrarySkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="aspect-[16/10] bg-slate-200" />
          <div className="space-y-3 p-6">
            <div className="h-5 w-3/4 rounded-lg bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-10 rounded-xl bg-slate-100" />
              <div className="h-10 rounded-xl bg-slate-100" />
            </div>
            <div className="h-11 rounded-xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
