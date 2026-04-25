import { getSettings } from "@/lib/server-settings";
import { readNodeCache, readSubscriptionUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getSettings();
  const [subscriptionUrl, cache] = await Promise.all([
    readSubscriptionUrl(),
    readNodeCache(),
  ]);

  return Response.json({
    ok: true,
    data: {
      settings,
      hasSubscription: Boolean(subscriptionUrl),
      subscriptionUrl,
      nodeCount: cache.nodes.length,
      updatedAt: cache.updatedAt,
    },
  });
}
