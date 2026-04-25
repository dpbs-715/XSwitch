import { assertAuthorized } from "@/lib/server-settings";
import { readSubscriptionUrl, saveSubscriptionUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  return Response.json({
    ok: true,
    data: {
      url: await readSubscriptionUrl(),
    },
  });
}

export async function POST(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();

  if (!url || !/^https?:\/\//.test(url)) {
    return Response.json(
      { ok: false, error: "请输入 http 或 https 订阅链接。" },
      { status: 400 },
    );
  }

  await saveSubscriptionUrl(url);
  return Response.json({ ok: true, data: { url } });
}
