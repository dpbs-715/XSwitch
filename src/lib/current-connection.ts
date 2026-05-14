import { readFile } from "node:fs/promises";

import { getSettings } from "./server-settings";
import { readNodeCache } from "./storage";
import type {
  CurrentConnection,
  OutboundSummary,
  ProxyProtocol,
  SubscriptionNode,
} from "./types";

type XrayConfig = {
  outbounds?: Array<Record<string, unknown>>;
};

export function resolveCurrentConnection(
  config: XrayConfig,
  nodes: SubscriptionNode[],
  outboundTag: string,
): CurrentConnection {
  const outbound = config.outbounds?.find((entry) => entry.tag === outboundTag);
  if (!outbound) {
    return { state: "missing-outbound", outboundTag };
  }

  const summary = summarizeOutbound(outbound);
  if (!summary) {
    return { state: "missing-outbound", outboundTag };
  }

  const node = nodes.find((entry) => nodeMatchesOutbound(entry, summary));
  if (!node) {
    return { state: "unmatched", outbound: summary };
  }

  return { state: "matched", node, outbound: summary };
}

export async function readCurrentConnection(): Promise<CurrentConnection> {
  const settings = getSettings();

  try {
    const [rawConfig, cache] = await Promise.all([
      readFile(settings.xrayConfigPath, "utf8"),
      readNodeCache(),
    ]);
    const config = JSON.parse(rawConfig) as XrayConfig;
    return resolveCurrentConnection(config, cache.nodes, settings.outboundTag);
  } catch (error) {
    return {
      state: "config-error",
      outboundTag: settings.outboundTag,
      error: error instanceof Error ? error.message : "配置读取失败",
    };
  }
}

function summarizeOutbound(outbound: Record<string, unknown>): OutboundSummary | null {
  const tag = stringValue(outbound.tag);
  const protocol = normalizeProtocol(stringValue(outbound.protocol));
  const streamSettings = recordValue(outbound.streamSettings);
  const network = optionalString(streamSettings?.network);
  const security = optionalString(streamSettings?.security);

  if (!tag || !protocol) {
    return null;
  }

  if (protocol === "vmess" || protocol === "vless") {
    const settings = recordValue(outbound.settings);
    const server = firstRecord(settings?.vnext);
    const user = firstRecord(server?.users);
    const address = stringValue(server?.address);
    const port = numberValue(server?.port);
    const id = optionalString(user?.id);

    if (!address || !port) {
      return null;
    }

    return compactSummary({
      tag,
      protocol,
      address,
      port,
      network,
      security,
      auth: compactAuth({
        id,
        security: optionalString(user?.security),
        encryption: optionalString(user?.encryption),
        flow: optionalString(user?.flow),
      }),
    });
  }

  const settings = recordValue(outbound.settings);
  const server = firstRecord(settings?.servers);
  const address = stringValue(server?.address);
  const port = numberValue(server?.port);

  if (!address || !port) {
    return null;
  }

  return compactSummary({
    tag,
    protocol,
    address,
    port,
    network,
    security,
    auth: compactAuth({
      password: optionalString(server?.password),
      method: optionalString(server?.method),
    }),
  });
}

function nodeMatchesOutbound(node: SubscriptionNode, outbound: OutboundSummary) {
  if (
    node.protocol !== outbound.protocol ||
    node.address !== outbound.address ||
    node.port !== outbound.port
  ) {
    return false;
  }

  const auth = outbound.auth ?? {};
  if (auth.id && stringValue(node.config.id) !== auth.id) {
    return false;
  }

  if (auth.password && stringValue(node.config.password) !== auth.password) {
    return false;
  }

  if (auth.method && stringValue(node.config.method) !== auth.method) {
    return false;
  }

  return true;
}

function normalizeProtocol(value: string): ProxyProtocol | null {
  if (value === "vmess" || value === "vless" || value === "trojan") {
    return value;
  }

  if (value === "shadowsocks" || value === "ss") {
    return "ss";
  }

  return null;
}

function firstRecord(value: unknown): Record<string, unknown> | undefined {
  return Array.isArray(value) ? recordValue(value[0]) : undefined;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

function compactAuth(auth: Record<string, string | undefined>) {
  const entries = Object.entries(auth).filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function compactSummary(summary: OutboundSummary): OutboundSummary {
  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== undefined),
  ) as OutboundSummary;
}
