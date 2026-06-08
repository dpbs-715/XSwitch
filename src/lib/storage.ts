import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSettings } from "./server-settings";
import type { NodeCache, SubscriptionNode } from "./types";

const subscriptionFile = "subscription-url.txt";
const subscriptionSourcesFile = "subscription-sources.json";
const nodeCacheFile = "nodes.json";
const maxSubscriptionSources = 12;

export async function ensureDataDir() {
  await mkdir(getSettings().dataDir, { recursive: true });
}

export async function readSubscriptionUrl(): Promise<string | null> {
  try {
    const value = await readFile(dataPath(subscriptionFile), "utf8");
    return value.trim() || null;
  } catch {
    return null;
  }
}

export async function readSubscriptionSources(): Promise<string[]> {
  const [currentUrl, savedSources] = await Promise.all([
    readSubscriptionUrl(),
    readSavedSubscriptionSources(),
  ]);

  return normalizeSubscriptionSources([currentUrl, ...savedSources]);
}

export async function saveSubscriptionUrl(url: string): Promise<string[]> {
  await ensureDataDir();
  const normalizedUrl = url.trim();
  const sources = normalizeSubscriptionSources([
    normalizedUrl,
    ...(await readSavedSubscriptionSources()),
  ]);

  await Promise.all([
    writeFile(dataPath(subscriptionFile), `${normalizedUrl}\n`, "utf8"),
    writeFile(
      dataPath(subscriptionSourcesFile),
      JSON.stringify(sources, null, 2),
      "utf8",
    ),
  ]);

  return sources;
}

export async function readNodeCache(): Promise<NodeCache> {
  try {
    const value = await readFile(dataPath(nodeCacheFile), "utf8");
    const cache = JSON.parse(value) as NodeCache;
    return {
      updatedAt: cache.updatedAt ?? null,
      nodes: Array.isArray(cache.nodes) ? cache.nodes : [],
    };
  } catch {
    return { updatedAt: null, nodes: [] };
  }
}

export async function saveNodeCache(nodes: SubscriptionNode[]) {
  await ensureDataDir();
  const cache: NodeCache = {
    updatedAt: new Date().toISOString(),
    nodes,
  };
  await writeFile(dataPath(nodeCacheFile), JSON.stringify(cache, null, 2), "utf8");
}

function dataPath(fileName: string) {
  return path.join(getSettings().dataDir, fileName);
}

async function readSavedSubscriptionSources(): Promise<string[]> {
  try {
    const value = await readFile(dataPath(subscriptionSourcesFile), "utf8");
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isString) : [];
  } catch {
    return [];
  }
}

function normalizeSubscriptionSources(values: Array<string | null>) {
  const seen = new Set<string>();
  const sources: string[] = [];

  for (const value of values) {
    const source = value?.trim();
    if (!source || seen.has(source)) {
      continue;
    }

    seen.add(source);
    sources.push(source);

    if (sources.length >= maxSubscriptionSources) {
      break;
    }
  }

  return sources;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
