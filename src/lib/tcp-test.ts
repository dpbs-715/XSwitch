import net from "node:net";

import type { SubscriptionNode } from "./types";

export async function testTcpLatency(
  node: SubscriptionNode,
  timeoutMs = 5000,
): Promise<{ latencyMs?: number; status: "online" | "offline" }> {
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const socket = net.connect({
      host: node.address,
      port: node.port,
      timeout: timeoutMs,
    });

    const finish = (status: "online" | "offline") => {
      socket.destroy();
      resolve({
        status,
        latencyMs:
          status === "online" ? Math.round(performance.now() - startedAt) : undefined,
      });
    };

    socket.once("connect", () => finish("online"));
    socket.once("timeout", () => finish("offline"));
    socket.once("error", () => finish("offline"));
  });
}
