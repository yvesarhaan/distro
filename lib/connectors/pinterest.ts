import type {
  PlatformConnector,
  PublishTarget,
  GeneratedPost,
  PublishResult,
} from "../types/connector";

export const pinterestConnector: PlatformConnector = {
  platform: "pinterest",

  getAuthUrl(): string {
    return "/api/auth/pinterest";
  },

  async handleAuthCallback(): Promise<never> {
    throw new Error(
      "Not used from the client — the OAuth callback is handled entirely " +
        "server-side by app/api/auth/pinterest/callback/route.ts."
    );
  },

  async getPublishTargets(): Promise<PublishTarget[]> {
    const res = await fetch("/api/pinterest/boards");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message ?? data.error ?? "Failed to load Pinterest boards."
      );
    }

    return (data.boards ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }));
  },

  formatContent({ imageUrl, detectedText }): GeneratedPost {
    return {
      platform: "pinterest",
      targetId: "",
      title: detectedText,
      caption: detectedText,
      imageUrl,
    };
  },

  async publish(_accessToken: string, post: GeneratedPost): Promise<PublishResult> {
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: post.imageUrl,
          title: post.title,
          caption: post.caption,
          boardId: post.targetId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.message ?? data.error ?? `Publish failed: ${res.status}`,
        };
      }

      return { success: true, platformPostId: data.post?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
