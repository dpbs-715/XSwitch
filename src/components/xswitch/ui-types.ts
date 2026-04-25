import type { AppSettings } from "@/lib/types";

export type Toast = {
  tone: "ok" | "error" | "info";
  message: string;
};

export type StatusPayload = {
  settings: AppSettings;
  hasSubscription: boolean;
  subscriptionUrl: string | null;
  nodeCount: number;
  updatedAt: string | null;
};

export type ProtocolFilter = "all" | "vmess" | "vless" | "trojan" | "ss";

export type BusyState = string | null;
