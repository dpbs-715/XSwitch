import { assertAuthorized } from "@/lib/server-settings";
import {
  fetchSubscription,
  parseSubscription,
} from "@/lib/subscription";
import {
  readSubscriptionUrl,
  saveNodeCache,
  saveSubscriptionUrl,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { url?: string };
    const url = body.url?.trim() || (await readSubscriptionUrl());

    if (!url || !/^https?:\/\//.test(url)) {
      return Response.json(
        { ok: false, error: "请先保存有效的订阅链接。" },
        { status: 400 },
      );
    }

    const content = await fetchSubscription(url);
    const nodes = parseSubscription(content);

    if (nodes.length === 0) {
      return Response.json(
        { ok: false, error: "订阅已拉取，但没有解析出支持的节点。" },
        { status: 422 },
      );
    }

    await Promise.all([saveSubscriptionUrl(url), saveNodeCache(nodes)]);

    return Response.json({
      ok: true,
      data: {
        updatedAt: new Date().toISOString(),
        nodes,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "刷新订阅失败。",
      },
      { status: 502 },
    );
  }
}
