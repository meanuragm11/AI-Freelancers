export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* The global Navbar from app/layout.tsx handles top navigation.
          This layout simply acts as a clean wrapper for buyer pages. */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}