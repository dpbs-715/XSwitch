import type { AppSettings, CurrentConnection } from "@/lib/types";

export type Toast = {
  tone: "ok" | "error" | "info";
  message: string;
};

export type StatusPayload = {
  settings: AppSettings;
  hasSubscription: boolean;
  subscriptionUrl: string | null;
  currentConnection: CurrentConnection;
  nodeCount: number;
  updatedAt: string | null;
};

export type ProtocolFilter = "all" | "vmess" | "vless" | "trojan" | "ss";

export type BusyState = string | null;
