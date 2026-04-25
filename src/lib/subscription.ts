import crypto from "node:crypto";

import type { ProxyProtocol, SubscriptionNode } from "./types";

type ParsedUrlNode = {
  name: string;
  protocol: ProxyProtocol;
  address: string;
  port: number;
  config: Record<string, unknown>;
};

export async function fetchSubscription(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "xswitch/0.1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`订阅拉取失败：HTTP ${response.status}`);
  }

  return response.text();
}

export function parseSubscription(content: string): SubscriptionNode[] {
  const decoded = maybeDecodeBase64(content);
  const lines = decoded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nodes = lines.flatMap((line) => {
    try {
      const node = parseNodeUri(line);
      return node ? [toSubscriptionNode(line, node)] : [];
    } catch {
      return [];
    }
  });

  return dedupeNodes(nodes);
}

export function toXrayOutbound(node: SubscriptionNode, tag: string) {
  const config = node.config;
  const streamSettings = buildStreamSettings(config);

  if (node.protocol === "vmess") {
    return compactObject({
      tag,
      protocol: "vmess",
      settings: {
        vnext: [
          {
            address: node.address,
            port: node.port,
            users: [
              compactObject({
                id: config.id,
                alterId: Number(config.alterId ?? 0),
                security: config.security ?? "auto",
              }),
            ],
          },
        ],
      },
      streamSettings,
    });
  }

  if (node.protocol === "vless") {
    return compactObject({
      tag,
      protocol: "vless",
      settings: {
        vnext: [
          {
            address: node.address,
            port: node.port,
            users: [
              compactObject({
                id: config.id,
                encryption: config.encryption ?? "none",
                flow: config.flow,
              }),
            ],
          },
        ],
      },
      streamSettings,
    });
  }

  if (node.protocol === "trojan") {
    return compactObject({
      tag,
      protocol: "trojan",
      settings: {
        servers: [
          compactObject({
            address: node.address,
            port: node.port,
            password: config.password,
          }),
        ],
      },
      streamSettings,
    });
  }

  return compactObject({
    tag,
    protocol: "shadowsocks",
    settings: {
      servers: [
        compactObject({
          address: node.address,
          port: node.port,
          method: config.method,
          password: config.password,
        }),
      ],
    },
  });
}

function parseNodeUri(raw: string): ParsedUrlNode | null {
  if (raw.startsWith("vmess://")) {
    return parseVmess(raw);
  }

  if (raw.startsWith("vless://")) {
    return parseGenericProxyUrl(raw, "vless");
  }

  if (raw.startsWith("trojan://")) {
    return parseGenericProxyUrl(raw, "trojan");
  }

  if (raw.startsWith("ss://")) {
    return parseShadowsocks(raw);
  }

  return null;
}

function parseVmess(raw: string): ParsedUrlNode {
  const body = raw.slice("vmess://".length);
  const data = JSON.parse(decodeBase64(body)) as Record<string, unknown>;
  const address = stringValue(data.add);
  const port = numberValue(data.port);

  return {
    name: stringValue(data.ps) || address,
    protocol: "vmess",
    address,
    port,
    config: {
      id: stringValue(data.id),
      alterId: numberValue(data.aid, 0),
      security: stringValue(data.scy) || "auto",
      network: stringValue(data.net) || "tcp",
      tls: stringValue(data.tls),
      sni: stringValue(data.sni),
      host: stringValue(data.host),
      path: stringValue(data.path),
      type: stringValue(data.type),
    },
  };
}

function parseGenericProxyUrl(
  raw: string,
  protocol: "vless" | "trojan",
): ParsedUrlNode {
  const url = new URL(raw);
  const address = url.hostname;
  const port = Number(url.port);
  const params = Object.fromEntries(url.searchParams.entries());

  return {
    name: decodeURIComponent(url.hash.slice(1)) || address,
    protocol,
    address,
    port,
    config: {
      ...params,
      id: protocol === "vless" ? decodeURIComponent(url.username) : undefined,
      password:
        protocol === "trojan" ? decodeURIComponent(url.username) : undefined,
      network: params.type ?? "tcp",
      tls: params.security,
      sni: params.sni,
      host: params.host,
      path: params.path,
    },
  };
}

function parseShadowsocks(raw: string): ParsedUrlNode {
  const normalized = raw.replace("ss://", "ss://user@");
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    url = new URL(normalized);
  }

  let method = decodeURIComponent(url.username);
  let password = decodeURIComponent(url.password);
  let address = url.hostname;
  let port = Number(url.port);

  if (!password && method) {
    const decodedUserInfo = maybeDecodeBase64(method);
    const [decodedMethod, decodedPassword] = decodedUserInfo.split(":");
    method = decodedMethod;
    password = decodedPassword;
  }

  if (!address || !port) {
    const withoutScheme = raw.slice("ss://".length).split("#")[0];
    const decoded = maybeDecodeBase64(withoutScheme);
    const match = decoded.match(/^([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (match) {
      method = match[1];
      password = match[2];
      address = match[3];
      port = Number(match[4]);
    }
  }

  return {
    name: decodeURIComponent(url.hash.slice(1)) || address,
    protocol: "ss",
    address,
    port,
    config: { method, password },
  };
}

function buildStreamSettings(config: Record<string, unknown>) {
  const network = stringValue(config.network) || "tcp";
  const security = stringValue(config.tls);
  const sni = stringValue(config.sni);
  const host = stringValue(config.host);
  const requestPath = stringValue(config.path);

  return compactObject({
    network,
    security: security === "tls" || security === "reality" ? security : undefined,
    tlsSettings:
      security === "tls"
        ? compactObject({
            serverName: sni || host,
          })
        : undefined,
    realitySettings:
      security === "reality"
        ? compactObject({
            serverName: sni || host,
            publicKey: config.pbk,
            shortId: config.sid,
            fingerprint: config.fp,
          })
        : undefined,
    wsSettings:
      network === "ws"
        ? compactObject({
            path: requestPath || "/",
            headers: host ? { Host: host } : undefined,
          })
        : undefined,
    grpcSettings:
      network === "grpc"
        ? compactObject({
            serviceName: config.serviceName,
          })
        : undefined,
  });
}

function toSubscriptionNode(raw: string, node: ParsedUrlNode): SubscriptionNode {
  return {
    id: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16),
    name: node.name,
    protocol: node.protocol,
    address: node.address,
    port: node.port,
    region: inferRegion(node.name),
    latencyMs: undefined,
    status: "unknown",
    raw,
    config: node.config,
  };
}

function dedupeNodes(nodes: SubscriptionNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.protocol}:${node.address}:${node.port}:${node.name}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function inferRegion(name: string) {
  const rules: Array<[RegExp, string]> = [
    [/香港|港|hk|hong\s*kong/i, "香港"],
    [/台湾|台|tw|taiwan/i, "台湾"],
    [/日本|日|jp|japan/i, "日本"],
    [/新加坡|狮城|sg|singapore/i, "新加坡"],
    [/美国|美|us|usa|united\s*states/i, "美国"],
    [/韩国|韩|kr|korea/i, "韩国"],
  ];

  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? "未知";
}

function maybeDecodeBase64(value: string) {
  try {
    const trimmed = value.trim();
    const decoded = decodeBase64(trimmed);
    if (/^(vmess|vless|trojan|ss):\/\//m.test(decoded)) {
      return decoded;
    }
    if (/^[^\s:]+:[^@]+@[^:]+:\d+$/.test(decoded)) {
      return decoded;
    }
  } catch {
    return value;
  }

  return value;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback?: number) {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error("节点端口无效");
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ""),
  ) as T;
}
