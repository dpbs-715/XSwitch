import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSettings } from "./server-settings";
import type { NodeCache, SubscriptionNode } from "./types";

const subscriptionFile = "subscription-url.txt";
const nodeCacheFile = "nodes.json";

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

export async function saveSubscriptionUrl(url: string) {
  await ensureDataDir();
  await writeFile(dataPath(subscriptionFile), `${url.trim()}\n`, "utf8");
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
