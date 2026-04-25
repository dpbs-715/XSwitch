import path from "node:path";

import type { AppSettings } from "./types";

export function getSettings(): AppSettings {
  const dataDir =
    process.env.XSWITCH_DATA_DIR ?? path.join(process.cwd(), ".xswitch");

  return {
    dataDir,
    xrayConfigPath:
      process.env.XSWITCH_XRAY_CONFIG ?? "/usr/local/etc/xray/config.json",
    outboundTag: process.env.XSWITCH_OUTBOUND_TAG ?? "proxy",
    restartCommand: normalizeRestartCommand(process.env.XSWITCH_RESTART_COMMAND),
    authEnabled: Boolean(process.env.XSWITCH_ADMIN_PASSWORD),
  };
}

export function assertAuthorized(request: Request): Response | null {
  const password = process.env.XSWITCH_ADMIN_PASSWORD;
  if (!password) {
    return null;
  }

  const headerPassword = request.headers.get("x-admin-password");
  if (headerPassword === password) {
    return null;
  }

  return Response.json(
    { ok: false, error: "需要管理密码，或密码不正确。" },
    { status: 401 },
  );
}

function normalizeRestartCommand(value: string | undefined): string | null {
  if (value === undefined) {
    return "systemctl restart xray";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
