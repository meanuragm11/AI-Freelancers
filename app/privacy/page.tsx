import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600">
          ← Back to Home
        </Link>
        <h1 className="mt-6 text-4xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm font-medium text-slate-500 leading-relaxed">
          Zelance respects your privacy. This policy describes how we collect, use, and protect information
          when you use our marketplace and messaging workspace.
        </p>
        <div className="mt-10 space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-black text-slate-900">Information We Collect</h2>
            <p className="mt-2">
              We collect account details, profile information, project communications, and payment metadata required
              to operate the platform and process transactions securely.
            </p>
          </section>
          <section>
            <h2 className="text-base font-black text-slate-900">How We Use Data</h2>
            <p className="mt-2">
              Data is used to authenticate users, facilitate collaborations, process escrow payments, prevent fraud,
              and improve platform reliability.
            </p>
          </section>
          <section>
            <h2 className="text-base font-black text-slate-900">Contact</h2>
            <p className="mt-2">
              For privacy requests or questions, contact us through the{" "}
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
