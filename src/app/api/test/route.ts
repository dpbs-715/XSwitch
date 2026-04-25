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

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const cache = await readNodeCache();
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
