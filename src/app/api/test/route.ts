import { readCurrentConnection } from "@/lib/current-connection";
import { assertAuthorized } from "@/lib/server-settings";
import { readNodeCache, saveNodeCache } from "@/lib/storage";
import { testTcpLatency } from "@/lib/tcp-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => ({}))) as {
    current?: boolean;
    id?: string;
  };
  const cache = await readNodeCache();

  if (body.current) {
    const currentConnection = await readCurrentConnection();

    if (
      currentConnection.state !== "matched" &&
      currentConnection.state !== "unmatched"
    ) {
      return Response.json(
        { ok: false, error: "当前连接没有可检测的地址。" },
        { status: 404 },
      );
    }

    const result = await testTcpLatency(currentConnection.outbound);
    const checkedAt = new Date().toISOString();

    if (currentConnection.state === "unmatched") {
      return Response.json({
        ok: true,
        data: {
          currentConnection: {
            ...currentConnection,
            health: {
              status: result.status,
              latencyMs: result.latencyMs,
              checkedAt,
            },
          },
          nodes: cache.nodes,
          updatedAt: cache.updatedAt,
        },
      });
    }

    const tested = cache.nodes.map((node) =>
      node.id === currentConnection.node.id
        ? {
            ...node,
            latencyMs: result.latencyMs,
            status: result.status,
          }
        : node,
    );
    await saveNodeCache(tested);

    return Response.json({
      ok: true,
      data: {
        currentConnection: {
          ...currentConnection,
          node: {
            ...currentConnection.node,
            latencyMs: result.latencyMs,
            status: result.status,
          },
          health: {
            status: result.status,
            latencyMs: result.latencyMs,
            checkedAt,
          },
        },
        nodes: tested,
        updatedAt: checkedAt,
      },
    });
  }

  const targets = body.id
    ? cache.nodes.filter((node) => node.id === body.id)
    : cache.nodes.slice(0, 80);

  if (targets.length === 0) {
    return Response.json(
      { ok: false, error: "没有可检测的节点。" },
      { status: 404 },
    );
  }

  const tested = await Promise.all(
    cache.nodes.map(async (node) => {
      if (!targets.some((target) => target.id === node.id)) {
        return node;
      }

      const result = await testTcpLatency(node);
      return {
        ...node,
        latencyMs: result.latencyMs,
        status: result.status,
      };
    }),
  );

  await saveNodeCache(tested);

  return Response.json({
    ok: true,
    data: {
      updatedAt: new Date().toISOString(),
      nodes: tested,
    },
  });
}
