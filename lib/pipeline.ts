import { getConnector } from "./connectors/registry";
import type { GeneratedPost, PublishResult } from "./types/connector";

export interface PlatformPreferences {
  platform: string;
  accessToken: string;
  defaultTargetId: string;
  captionSource: "ocr" | "manual";
  titleSource: "ocr" | "manual";
  useTitle: boolean;
  useCaption: boolean;
  captionThreshold: number;
  quickPublish: boolean;
  requireConfirmation: boolean;
}

export interface UploadResult {
  imageUrl: string;
  detectedText: string;
}

export async function runOcr(imageUrl: string): Promise<string> {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `OCR failed: ${res.status}`);
  }

  const raw = data.text ?? "";
  return raw.replace(/\s+/g, " ").trim();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const PINTEREST_TITLE_LIMIT = 100;
const PINTEREST_CAPTION_LIMIT = 500;

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");

  if (lastSpace <= 0) return sliced.trim();
  return sliced.slice(0, lastSpace).trim();
}

export function buildPost(
  upload: UploadResult,
  prefs: PlatformPreferences
): GeneratedPost {
  const connector = getConnector(prefs.platform);
  const post = connector.formatContent({
    imageUrl: upload.imageUrl,
    detectedText: upload.detectedText,
  });

  const words = wordCount(upload.detectedText);
  const overThreshold = words > prefs.captionThreshold;

  let shouldUseTitle: boolean;
  let shouldUseCaption: boolean;

  if (prefs.useTitle && prefs.useCaption) {
    shouldUseTitle = !overThreshold;
    shouldUseCaption = overThreshold;
  } else {
    shouldUseTitle = prefs.useTitle;
    shouldUseCaption = prefs.useCaption;
  }

  post.caption = shouldUseCaption ? upload.detectedText : "";
  post.title = shouldUseTitle ? upload.detectedText : undefined;

  if (!upload.detectedText) {
    post.caption = "(no caption — OCR found no text in this image)";
    post.title = undefined;
  }

  if (post.title) {
    post.title = truncateAtWordBoundary(post.title, PINTEREST_TITLE_LIMIT);
  }
  if (post.caption) {
    post.caption = truncateAtWordBoundary(post.caption, PINTEREST_CAPTION_LIMIT);
  }

  post.targetId = prefs.defaultTargetId;
  return post;
}

export async function publishForPlatform(
  upload: UploadResult,
  prefs: PlatformPreferences
): Promise<
  | { status: "published"; result: PublishResult }
  | { status: "needs_review"; draft: GeneratedPost }
> {
  const draft = buildPost(upload, prefs);

  if (!prefs.quickPublish || prefs.requireConfirmation) {
    return { status: "needs_review", draft };
  }

  const connector = getConnector(prefs.platform);
  const result = await connector.publish(prefs.accessToken, draft);
  return { status: "published", result };
}

export async function processUpload(
  upload: UploadResult,
  allPrefs: PlatformPreferences[]
) {
  return Promise.all(
    allPrefs.map((prefs) => publishForPlatform(upload, prefs))
  );
}

export async function publishDraft(
  draft: GeneratedPost,
  prefs: PlatformPreferences
): Promise<PublishResult> {
  const connector = getConnector(prefs.platform);
  return connector.publish(prefs.accessToken, draft);
}
