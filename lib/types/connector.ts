export interface PublishTarget {
  id: string;
  name: string;
}

export interface GeneratedPost {
  platform: string;
  targetId: string;
  title?: string;
  caption: string;
  imageUrl: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface PlatformConnector {
  platform: string;
  getAuthUrl(redirectUri: string): string;
  handleAuthCallback(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
  getPublishTargets(accessToken: string): Promise<PublishTarget[]>;
  formatContent(raw: { imageUrl: string; detectedText: string }): GeneratedPost;
  publish(accessToken: string, post: GeneratedPost): Promise<PublishResult>;
}
