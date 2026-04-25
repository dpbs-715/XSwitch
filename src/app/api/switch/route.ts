import { assertAuthorized } from "@/lib/server-settings";
import { readNodeCache } from "@/lib/storage";
import { switchXrayNode } from "@/lib/xray";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as { id?: string };
  const cache = await readNodeCache();
  const node = cache.nodes.find((entry) => entry.id === body.id);

  if (!node) {
    return Response.json(
      { ok: false, error: "没有找到要切换的节点，请刷新订阅后再试。" },
      { status: 404 },
    );
  }

  const result = await switchXrayNode(node);

  return Response.json({
    ok: true,
    data: {
      node,
      ...result,
    },
  });
}
