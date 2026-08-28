import type { PlatformConnector } from "../types/connector";
import { pinterestConnector } from "./pinterest";

export const connectorRegistry: Record<string, PlatformConnector> = {
  pinterest: pinterestConnector,
};

export function getConnector(platform: string): PlatformConnector {
  const connector = connectorRegistry[platform];
  if (!connector) {
    throw new Error(`No connector registered for platform: ${platform}`);
  }
  return connector;
}
