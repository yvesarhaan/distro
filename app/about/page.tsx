export default function AboutPage() {
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
          About
        </h1>

        <p className="mt-8 text-[15px] leading-relaxed text-zinc-700">
          Distro is a personal tool that automates publishing images to my
          own social media accounts. It removes repetitive manual posting by
          using saved preferences to auto-generate captions and titles from
          uploaded images.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
          Upload an image, and it publishes according to preferences
          configured once in Settings — no repeated prompts, no manual
          caption writing.
        </p>
      </div>
    </main>
  );
}
