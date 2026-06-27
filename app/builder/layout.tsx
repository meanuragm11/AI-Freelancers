export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Removed the dark background class [#0b1120] and replaced with bg-slate-50
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}