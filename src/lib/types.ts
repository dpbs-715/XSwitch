export type ProxyProtocol = "vmess" | "vless" | "trojan" | "ss";

export type NodeStatus = "unknown" | "checking" | "online" | "offline";

export type SubscriptionNode = {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  address: string;
  port: number;
  region: string;
  latencyMs?: number;
  status: NodeStatus;
  raw: string;
  config: Record<string, unknown>;
};

export type NodeCache = {
  updatedAt: string | null;
  nodes: SubscriptionNode[];
};

export type AppSettings = {
  dataDir: string;
  xrayConfigPath: string;
  outboundTag: string;
  restartCommand: string | null;
  authEnabled: boolean;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };
