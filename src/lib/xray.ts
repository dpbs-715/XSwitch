import { copyFile, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getSettings } from "./server-settings";
import { toXrayOutbound } from "./subscription";
import type { SubscriptionNode } from "./types";

const execFileAsync = promisify(execFile);

type XrayConfig = {
  outbounds?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export async function switchXrayNode(node: SubscriptionNode) {
  const settings = getSettings();
  const rawConfig = await readFile(settings.xrayConfigPath, "utf8");
  const config = JSON.parse(rawConfig) as XrayConfig;
  const backupPath = `${settings.xrayConfigPath}.bak`;

  await copyFile(settings.xrayConfigPath, backupPath);

  const outbound = toXrayOutbound(node, settings.outboundTag);
  const outbounds = Array.isArray(config.outbounds) ? config.outbounds : [];
  const existingIndex = outbounds.findIndex(
    (entry) => entry.tag === settings.outboundTag,
  );

  if (existingIndex >= 0) {
    outbounds[existingIndex] = outbound;
  } else {
    outbounds.unshift(outbound);
  }

  config.outbounds = outbounds;
  await writeFile(settings.xrayConfigPath, `${JSON.stringify(config, null, 2)}\n`);
  await restartXray();

  return {
    backupPath,
    configPath: settings.xrayConfigPath,
    outboundTag: settings.outboundTag,
  };
}

export async function restartXray() {
  const command = getSettings().restartCommand;
  if (!command) {
    return { skipped: true };
  }

  const [file, ...args] = splitCommand(command);
  if (!file) {
    return { skipped: true };
  }

  const result = await execFileAsync(file, args, {
    timeout: 30_000,
  });

  return {
    skipped: false,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function splitCommand(command: string) {
  const matches = command.match(/"([^"]+)"|'([^']+)'|[^\s]+/g) ?? [];
  return matches.map((part) => part.replace(/^["']|["']$/g, ""));
}
