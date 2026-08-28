export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF9] pb-24">
      <div className="mx-auto max-w-lg px-6 pt-6 sm:px-10">
        <a
          href="/upload"
          className="text-[13px] font-medium text-zinc-400 transition hover:text-zinc-900"
        >
          ← Distro
        </a>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900">
          Privacy Policy
        </h1>

        <p className="mt-8 text-[15px] leading-relaxed text-zinc-700">
          This app is for personal, single-user use only. It does not
          collect, store, or share data from any user other than its owner.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
          Images uploaded are used solely to generate and publish content to
          the owner's own connected social media accounts. No data is sold
          or shared with third parties.
        </p>
      </div>
    </main>
  );
}
