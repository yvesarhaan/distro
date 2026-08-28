"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  publishForPlatform,
  publishDraft,
  runOcr,
  type PlatformPreferences,
} from "../../lib/pipeline";
import type { GeneratedPost } from "../../lib/types/connector";

type Status =
  | "idle"
  | "uploading"
  | "manual-entry"
  | "reading"
  | "processing"
  | "review"
  | "publishing"
  | "done"
  | "error";

export default function UploadPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingPrefs, setPendingPrefs] = useState<PlatformPreferences | null>(
    null
  );
  const [manualText, setManualText] = useState("");
  const [reviewDraft, setReviewDraft] = useState<GeneratedPost | null>(null);
  const [editingField, setEditingField] = useState<"title" | "caption" | null>(
    null
  );

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setStatus("uploading");
    setMessage("");

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        throw new Error(`Couldn't save image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(path);
      const imageUrl = publicUrlData.publicUrl;

      const { data: prefsRow } = await supabase
        .from("publishing_preferences")
        .select("*")
        .eq("platform", "pinterest")
        .maybeSingle();

      if (!prefsRow || !prefsRow.default_target) {
        setStatus("error");
        setMessage("Pick a board in Settings first");
        return;
      }

      const prefs: PlatformPreferences = {
        platform: "pinterest",
        accessToken: "",
        defaultTargetId: prefsRow.default_target,
        captionSource: prefsRow.caption_source ?? "ocr",
        titleSource: prefsRow.title_source ?? "ocr",
        useTitle: prefsRow.use_title ?? true,
        useCaption: prefsRow.use_caption ?? true,
        captionThreshold: prefsRow.caption_threshold ?? 100,
        quickPublish: prefsRow.quick_publish ?? true,
        requireConfirmation: prefsRow.require_confirmation ?? false,
      };

      const wantsManual =
        (prefs.useTitle && prefs.titleSource === "manual") ||
        (prefs.useCaption && prefs.captionSource === "manual");

      if (wantsManual) {
        setPendingImageUrl(imageUrl);
        setPendingPrefs(prefs);
        setManualText("");
        setStatus("manual-entry");
        return;
      }

      setStatus("reading");
      let detectedText = "";
      try {
        detectedText = await runOcr(imageUrl);
      } catch {
        detectedText = "";
      }

      await continueWithText(imageUrl, prefs, detectedText);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Something went wrong");
    }
  }

  async function continueWithText(
    imageUrl: string,
    prefs: PlatformPreferences,
    detectedText: string
  ) {
    setStatus("processing");

    try {
      const result = await publishForPlatform(
        { imageUrl, detectedText },
        prefs
      );

      if (result.status === "needs_review") {
        setReviewDraft(result.draft);
        setPendingPrefs(prefs);
        setStatus("review");
        return;
      }

      if (!result.result.success) {
        setStatus("error");
        setMessage(result.result.error ?? "Something went wrong publishing");
        return;
      }

      setStatus("done");
      setMessage("Published to your Pinterest board");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Something went wrong");
    }
  }

  async function handleManualSubmit() {
    if (!pendingImageUrl || !pendingPrefs) return;
    await continueWithText(pendingImageUrl, pendingPrefs, manualText.trim());
  }

  function updateReviewField(field: "title" | "caption", value: string) {
    setReviewDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleConfirmPublish() {
    if (!reviewDraft || !pendingPrefs) return;
    setStatus("publishing");
    try {
      const result = await publishDraft(reviewDraft, pendingPrefs);
      if (!result.success) {
        setStatus("error");
        setMessage(result.error ?? "Something went wrong publishing");
        return;
      }
      setStatus("done");
      setMessage("Published to your Pinterest board");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ?? "Something went wrong");
    }
  }

  function reset() {
    setStatus("idle");
    setMessage("");
    setPreviewUrl(null);
    setPendingImageUrl(null);
    setPendingPrefs(null);
    setManualText("");
    setReviewDraft(null);
    setEditingField(null);
  }

  const isBusy =
    status === "uploading" || status === "reading" || status === "processing";

  if (status === "manual-entry") {
    return (
      <main className="min-h-screen bg-[#FAFAF9] pb-24">
        <div className="mx-auto max-w-lg px-6 pt-6 sm:px-10">
          <button
            onClick={reset}
            className="text-[13px] font-medium text-zinc-400 transition hover:text-zinc-900"
          >
            ← Distro
          </button>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900">
            Write it yourself
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            Settings is set to type this in manually instead of reading it
            from the image.
          </p>

          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              className="mt-6 aspect-square w-full max-w-[240px] rounded-[20px] object-cover"
            />
          )}

          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type the title or caption for this pin…"
            rows={4}
            className="mt-6 w-full rounded-[16px] border border-zinc-200 bg-white p-4 text-[15px] text-zinc-900 outline-none focus:border-zinc-400"
          />

          <button
            onClick={handleManualSubmit}
            disabled={!manualText.trim()}
            className="mt-6 w-full rounded-[16px] bg-zinc-900 py-3.5 text-[15px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  if (status === "review" || status === "publishing") {
    return (
      <main className="min-h-screen bg-[#FAFAF9] pb-24">
        <div className="mx-auto max-w-lg px-6 pt-6 sm:px-10">
          <button
            onClick={reset}
            className="text-[13px] font-medium text-zinc-400 transition hover:text-zinc-900"
          >
            ← Distro
          </button>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-zinc-900">
            Review before posting
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            Quick Publish is off, so nothing goes out until you approve it.
          </p>

          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              className="mt-6 aspect-square w-full max-w-[240px] rounded-[20px] object-cover"
            />
          )}

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Title
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setEditingField(editingField === "title" ? null : "title")
                  }
                  aria-label="Edit title"
                  className="text-zinc-300 transition hover:text-zinc-600"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              {editingField === "title" ? (
                <textarea
                  autoFocus
                  value={reviewDraft?.title ?? ""}
                  onChange={(e) => updateReviewField("title", e.target.value)}
                  onBlur={() => setEditingField(null)}
                  rows={2}
                  className="mt-1 w-full rounded-[12px] border border-zinc-200 bg-white p-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-400"
                />
              ) : (
                <p className="mt-1 text-[15px] text-zinc-900">
                  {reviewDraft?.title || "—"}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">
                  Caption
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setEditingField(
                      editingField === "caption" ? null : "caption"
                    )
                  }
                  aria-label="Edit caption"
                  className="text-zinc-300 transition hover:text-zinc-600"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              {editingField === "caption" ? (
                <textarea
                  autoFocus
                  value={reviewDraft?.caption ?? ""}
                  onChange={(e) =>
                    updateReviewField("caption", e.target.value)
                  }
                  onBlur={() => setEditingField(null)}
                  rows={3}
                  className="mt-1 w-full rounded-[12px] border border-zinc-200 bg-white p-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-400"
                />
              ) : (
                <p className="mt-1 text-[15px] text-zinc-900">
                  {reviewDraft?.caption || "—"}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirmPublish}
            disabled={status === "publishing"}
            className="mt-8 w-full rounded-[16px] bg-zinc-900 py-3.5 text-[15px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {status === "publishing" ? "Publishing…" : "Publish"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <div className="flex items-baseline justify-between px-6 pt-6 sm:px-10">
        <span className="text-[22px] font-semibold tracking-tight text-zinc-900">
          Distro
        </span>
        <a
          href="/settings"
          className="text-[13px] font-medium text-zinc-400 transition hover:text-zinc-900"
        >
          Settings
        </a>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <label
          htmlFor="upload"
          className={`group relative flex aspect-square w-full max-w-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-zinc-200 transition ${
            isBusy ? "pointer-events-none" : "hover:border-zinc-900"
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <span className="text-[40px] font-light leading-none text-zinc-300 transition group-hover:text-zinc-900">
                +
              </span>
              <span className="text-[13px] font-medium tracking-wide text-zinc-400">
                UPLOAD IMAGE
              </span>
            </div>
          )}

          {isBusy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95">
              <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-zinc-200 border-t-zinc-900" />
              <span className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">
                {status === "uploading"
                  ? "Uploading"
                  : status === "reading"
                  ? "Reading text"
                  : "Processing"}
              </span>
            </div>
          )}

          <input
            id="upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>

        {status === "done" && (
          <div className="mt-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span className="text-[13px] font-medium text-zinc-700">
              {message}
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            <span className="text-[13px] font-medium text-zinc-700">
              {message}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pb-8">
        <a
          href="/about"
          className="text-[12px] text-zinc-300 transition hover:text-zinc-500"
        >
          About
        </a>
        <span className="text-[12px] text-zinc-200">·</span>
        <a
          href="/privacy"
          className="text-[12px] text-zinc-300 transition hover:text-zinc-500"
        >
          Privacy
        </a>
      </div>
    </main>
  );
}
