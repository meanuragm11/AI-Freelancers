export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar is rendered globally in app/layout.tsx */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}