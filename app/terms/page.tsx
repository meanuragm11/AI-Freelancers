import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600">
          ← Back to Home
        </Link>
        <h1 className="mt-6 text-4xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-sm font-medium text-slate-500 leading-relaxed">
          These terms govern your use of Zelance. By using the platform you agree to our marketplace rules,
          escrow policies, and acceptable use guidelines for buyers and builders.
        </p>
        <div className="mt-10 space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-black text-slate-900">Marketplace Use</h2>
            <p className="mt-2">
              Zelance connects buyers with AI builders and facilitates secure payments through escrow.
              All project agreements, negotiations, and deliverables should be documented within the platform workspace.
            </p>
          </section>
          <section>
            <h2 className="text-base font-black text-slate-900">Payments & Escrow</h2>
            <p className="mt-2">
              Funds are held in escrow until agreed deliverables are accepted. Platform fees apply to protected transactions
              as shown at checkout.
            </p>
          </section>
          <section>
            <h2 className="text-base font-black text-slate-900">Contact</h2>
            <p className="mt-2">
              Questions about these terms? Visit our{" "}
              <Link href="/support" className="font-bold text-blue-600 hover:underline">
                support portal
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
