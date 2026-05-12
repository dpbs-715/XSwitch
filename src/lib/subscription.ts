import crypto from "node:crypto";

import type { ProxyProtocol, SubscriptionNode } from "./types";

type ParsedUrlNode = {
  name: string;
  protocol: ProxyProtocol;
  address: string;
  port: number;
  config: Record<string, unknown>;
};

const subscriptionUserAgents = [
  "Shadowrocket/2.2.48",
  "ClashforWindows/0.20.39",
  "Clash.Meta",
  "v2rayN/6.23",
  "xswitch/0.1",
] as const;

const informationNodePattern =
  /剩余流量|套餐到期|到期时间|官网|官方|流量|直连地址|更换客户端|邀请|返佣|https?:\/\/|bit\.ly|expire|traffic|subscription|status/i;

export async function fetchSubscription(url: string): Promise<string> {
  const errors: string[] = [];

  for (const userAgent of subscriptionUserAgents) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "user-agent": userAgent,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        errors.push(`${userAgent}: HTTP ${response.status}`);
        continue;
      }

      const content = await response.text();
      if (contentLooksLikeSubscription(content)) {
        return content;
      }

      errors.push(`${userAgent}: ${content.trim() ? "非订阅内容" : "空内容"}`);
    } catch (error) {
      errors.push(`${userAgent}: ${formatFetchError(error)}`);
    }
  }

  throw new Error(`订阅拉取失败：${errors.join("；")}`);
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

  return dedupeNodes([...nodes, ...parseClashProxies(decoded)]).filter(
    isUsableNode,
  );
}

export function toXrayOutbound(node: SubscriptionNode, tag: string) {
  const config = node.config;
  const streamSettings = buildStreamSettings(config, node.protocol);

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

function parseClashProxies(content: string): SubscriptionNode[] {
  if (!/^\s*proxies\s*:/m.test(content)) {
    return [];
  }

  const entries = extractClashProxyEntries(content);
  return entries.flatMap((entry) => {
    try {
      const node = clashProxyToParsedNode(entry);
      return node ? [toSubscriptionNode(JSON.stringify(entry), node)] : [];
    } catch {
      return [];
    }
  });
}

function contentLooksLikeSubscription(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  const decoded = maybeDecodeBase64(trimmed);
  return (
    /(^|\n)\s*(vmess|vless|trojan|ss):\/\//.test(decoded) ||
    /^\s*proxies\s*:/m.test(decoded)
  );
}

function formatFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "请求失败";
  }

  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const detail = cause as {
      code?: string;
      address?: string;
      port?: number;
      message?: string;
    };
    return [
      error.message,
      detail.code,
      detail.address ? `${detail.address}:${detail.port ?? ""}` : "",
      detail.message && detail.message !== error.message ? detail.message : "",
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return error.message;
}

function extractClashProxyEntries(content: string) {
  const lines = content.split(/\r?\n/);
  const entries: Array<Record<string, unknown>> = [];
  let inProxies = false;
  let current: Record<string, unknown> | null = null;

  for (const line of lines) {
    if (/^\s*proxies\s*:\s*$/.test(line)) {
      inProxies = true;
      continue;
    }

    if (!inProxies) {
      continue;
    }

    if (/^\S/.test(line) && !line.startsWith("proxies:")) {
      break;
    }

    const itemMatch = line.match(/^\s*-\s*(.*)$/);
    if (itemMatch) {
      if (current) {
        entries.push(current);
      }
      current = {};
      const rest = itemMatch[1].trim();
      if (rest.startsWith("{") && rest.endsWith("}")) {
        current = parseInlineYamlObject(rest);
        entries.push(current);
        current = null;
      } else if (rest.includes(":")) {
        const [key, value] = splitYamlPair(rest);
        current[key] = parseYamlScalar(value);
      }
      continue;
    }

    if (current) {
      const pairMatch = line.match(/^\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (pairMatch) {
        current[pairMatch[1]] = parseYamlScalar(pairMatch[2]);
      }
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function clashProxyToParsedNode(
  proxy: Record<string, unknown>,
): ParsedUrlNode | null {
  const type = stringValue(proxy.type).toLowerCase();
  if (!["vmess", "vless", "trojan", "ss", "shadowsocks"].includes(type)) {
    return null;
  }

  const address = stringValue(proxy.server);
  const port = numberValue(proxy.port);
  const name = stringValue(proxy.name) || address;

  if (type === "vmess") {
    return {
      name,
      protocol: "vmess",
      address,
      port,
      config: {
        id: proxy.uuid,
        alterId: proxy.alterId ?? proxy.alterid ?? 0,
        security: proxy.cipher ?? "auto",
        network: proxy.network ?? "tcp",
        tls: proxy.tls === true ? "tls" : "",
        sni: proxy.servername,
        host: proxy.host,
        path: proxy.path,
      },
    };
  }

  if (type === "vless") {
    return {
      name,
      protocol: "vless",
      address,
      port,
      config: {
        id: proxy.uuid,
        encryption: "none",
        flow: proxy.flow,
        network: proxy.network ?? "tcp",
        tls: proxy.tls === true ? "tls" : stringValue(proxy.security),
        sni: proxy.servername,
        host: proxy.host,
        path: proxy.path,
      },
    };
  }

  if (type === "trojan") {
    return {
      name,
      protocol: "trojan",
      address,
      port,
      config: {
        password: proxy.password,
        network: proxy.network ?? "tcp",
        tls: "tls",
        sni: proxy.sni ?? proxy.servername,
      },
    };
  }

  if (type === "ss" || type === "shadowsocks") {
    return {
      name,
      protocol: "ss",
      address,
      port,
      config: {
        method: proxy.cipher,
        password: proxy.password,
      },
    };
  }

  return null;
}

function parseInlineYamlObject(value: string) {
  const body = value.slice(1, -1);
  const result: Record<string, unknown> = {};

  for (const part of splitInlineYamlParts(body)) {
    if (!part.includes(":")) {
      continue;
    }
    const [key, rawValue] = splitYamlPair(part);
    result[key] = parseYamlScalar(rawValue);
  }

  return result;
}

function splitInlineYamlParts(value: string) {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (const char of value) {
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    }

    if (char === "," && quote === null) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function splitYamlPair(value: string): [string, string] {
  const index = value.indexOf(":");
  return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
}

function parseYamlScalar(value: string): unknown {
  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^["']|["']$/g, "");

  if (unquoted === "true") {
    return true;
  }
  if (unquoted === "false") {
    return false;
  }
  if (/^\d+$/.test(unquoted)) {
    return Number(unquoted);
  }

  return unquoted;
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
      tls: params.security ?? (protocol === "trojan" ? "tls" : undefined),
      sni: params.sni ?? params.peer,
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

function buildStreamSettings(
  config: Record<string, unknown>,
  protocol: ProxyProtocol,
) {
  const network = stringValue(config.network) || "tcp";
  const security =
    stringValue(config.tls) || (protocol === "trojan" ? "tls" : "");
  const sni = stringValue(config.sni) || stringValue(config.peer);
  const host = stringValue(config.host);
  const requestPath = stringValue(config.path);
  const allowInsecure = booleanValue(config.allowInsecure);
  const tcpFastOpen = booleanValue(config.tfo);

  return compactObject({
    network,
    security: security === "tls" || security === "reality" ? security : undefined,
    tlsSettings:
      security === "tls"
        ? compactObject({
            serverName: sni || host,
            allowInsecure,
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
    sockopt: tcpFastOpen
      ? {
          tcpFastOpen,
        }
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

function isUsableNode(node: SubscriptionNode) {
  if (
    informationNodePattern.test(node.name) ||
    !node.address ||
    !Number.isInteger(node.port) ||
    node.port <= 0 ||
    node.port > 65535
  ) {
    return false;
  }

  if (node.protocol === "vmess" || node.protocol === "vless") {
    return Boolean(stringValue(node.config.id));
  }

  if (node.protocol === "trojan") {
    return Boolean(stringValue(node.config.password));
  }

  return Boolean(
    stringValue(node.config.method) && stringValue(node.config.password),
  );
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
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
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

function booleanValue(value: unknown) {
  if (value === true) {
    return true;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  return /^(1|true|yes)$/i.test(value) ? true : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ""),
  ) as T;
}
