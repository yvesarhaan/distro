"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        background: checked ? "#059669" : "#E4E4E7",
        position: "relative",
        flexShrink: 0,
        border: "none",
        padding: 0,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#FFFFFF",
          transform: checked ? "translateX(18px)" : "translateX(0px)",
          transition: "transform 0.15s ease",
        }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </p>
  );
}

function Row({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between gap-4 border-b border-zinc-200 py-3 last:border-b-0 ${
        sub ? "pl-4" : ""
      }`}
    >
      {children}
    </div>
  );
}

const PLATFORM = "pinterest";

interface BoardOption {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [defaultBoard, setDefaultBoard] = useState("");
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [boardsError, setBoardsError] = useState("");
  const [pinterestConnected, setPinterestConnected] = useState(true);
  const [justConnected, setJustConnected] = useState(false);
  const [captionSource, setCaptionSource] = useState<"ocr" | "manual">("ocr");
  const [titleSource, setTitleSource] = useState<"ocr" | "manual">("ocr");
  const [useTitle, setUseTitle] = useState(true);
  const [useCaption, setUseCaption] = useState(true);
  const [captionThreshold, setCaptionThreshold] = useState(100);
  const [quickPublish, setQuickPublish] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pinterest_connected")) {
      setJustConnected(true);
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    async function loadBoards() {
      try {
        const res = await fetch("/api/pinterest/boards");
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "not_connected") {
            setPinterestConnected(false);
            return;
          }
          setBoardsError(data.message ?? data.error ?? "Couldn't load your Pinterest boards.");
          return;
        }
        setPinterestConnected(true);
        setBoardOptions(data.boards ?? []);
      } catch {
        setBoardsError("Couldn't reach Pinterest to load your boards.");
      }
    }
    loadBoards();
  }, [justConnected]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("publishing_preferences")
        .select("*")
        .eq("platform", PLATFORM)
        .maybeSingle();

      if (data) {
        setDefaultBoard(data.default_target ?? "");
        setCaptionSource(data.caption_source ?? "ocr");
        setTitleSource(data.title_source ?? "ocr");
        setUseTitle(data.use_title ?? true);
        setUseCaption(data.use_caption ?? true);
        setCaptionThreshold(data.caption_threshold ?? 100);
        setQuickPublish(data.quick_publish ?? true);
        setRequireConfirmation(data.require_confirmation ?? false);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaveState("saving");

    const { error } = await supabase.from("publishing_preferences").upsert(
      {
        platform: PLATFORM,
        default_target: defaultBoard,
        caption_source: captionSource,
        title_source: titleSource,
        use_title: useTitle,
        use_caption: useCaption,
        caption_threshold: captionThreshold,
        quick_publish: quickPublish,
        require_confirmation: requireConfirmation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "platform" }
    );

    setSaveState(error ? "error" : "saved");
    setTimeout(() => setSaveState("idle"), 1800);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <span className="text-[13px] text-zinc-400">Loading…</span>
      </main>
    );
  }

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
          Pinterest
        </h1>

        <div className="mt-10">
          <SectionLabel>Destination</SectionLabel>

          {justConnected && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-emerald-50 px-4 py-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span className="text-[13px] font-medium text-emerald-800">
                Pinterest connected
              </span>
            </div>
          )}

          {!pinterestConnected ? (
            <div>
              <p className="text-[13px] leading-relaxed text-zinc-500">
                Connect your Pinterest account to choose a board and start
                publishing.
              </p>
              <a
                href="/api/auth/pinterest"
                className="mt-3 inline-block rounded-[16px] bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white transition hover:bg-zinc-800"
              >
                Connect Pinterest
              </a>
            </div>
          ) : (
            <>
              <Row>
                <span className="text-[15px] text-zinc-900">Board</span>
                <select
                  value={defaultBoard}
                  onChange={(e) => setDefaultBoard(e.target.value)}
                  className="appearance-none bg-transparent text-right text-[15px] text-zinc-500 outline-none"
                >
                  <option value="">Select a board</option>
                  {boardOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Row>
              {boardsError && (
                <p className="mt-3 text-[13px] leading-relaxed text-red-500">
                  {boardsError}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-10">
          <SectionLabel>Content</SectionLabel>

          <Row>
            <span className="text-[15px] text-zinc-900">Title</span>
            <Toggle checked={useTitle} onChange={setUseTitle} label="Use title" />
          </Row>
          {useTitle && (
            <Row sub>
              <span className="text-[13px] text-zinc-500">Source</span>
              <select
                value={titleSource}
                onChange={(e) =>
                  setTitleSource(e.target.value as "ocr" | "manual")
                }
                className="appearance-none bg-transparent text-right text-[13px] text-zinc-500 outline-none"
              >
                <option value="ocr">Detected from image</option>
                <option value="manual">Type it each time</option>
              </select>
            </Row>
          )}

          <Row>
            <span className="text-[15px] text-zinc-900">Caption</span>
            <Toggle
              checked={useCaption}
              onChange={setUseCaption}
              label="Use caption"
            />
          </Row>
          {useCaption && (
            <>
              <Row sub>
                <span className="text-[13px] text-zinc-500">Source</span>
                <select
                  value={captionSource}
                  onChange={(e) =>
                    setCaptionSource(e.target.value as "ocr" | "manual")
                  }
                  className="appearance-none bg-transparent text-right text-[13px] text-zinc-500 outline-none"
                >
                  <option value="ocr">Detected from image</option>
                  <option value="manual">Type it each time</option>
                </select>
              </Row>
              <Row sub>
                <span className="text-[13px] text-zinc-500">
                  Switch to caption above
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={captionThreshold}
                    onChange={(e) =>
                      setCaptionThreshold(Number(e.target.value))
                    }
                    className="w-10 bg-transparent text-right text-[13px] text-zinc-900 outline-none"
                  />
                  <span className="text-[13px] font-medium text-zinc-700">
                    words
                  </span>
                </div>
              </Row>
            </>
          )}
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
            Counted by <span className="font-medium text-zinc-500">words</span>,
            not characters. Below that many words, the title is used alone —
            above it, the caption is used instead.
          </p>
        </div>

        <div className="mt-10">
          <SectionLabel>Publishing</SectionLabel>
          <Row>
            <span className="text-[15px] text-zinc-900">Quick Publish</span>
            <Toggle
              checked={quickPublish}
              onChange={setQuickPublish}
              label="Quick publish"
            />
          </Row>
          <Row>
            <span className="text-[15px] text-zinc-900">
              Confirm before publishing
            </span>
            <Toggle
              checked={requireConfirmation}
              onChange={setRequireConfirmation}
              label="Require confirmation"
            />
          </Row>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
            With Quick Publish on, uploads go straight to your board — no
            review, no prompts.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="mt-12 w-full rounded-[16px] bg-zinc-900 py-3.5 text-[15px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved"}
          {saveState === "error" && "Couldn't save — try again"}
          {saveState === "idle" && "Save"}
        </button>
      </div>
    </main>
  );
}
