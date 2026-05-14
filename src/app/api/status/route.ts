import { getSettings } from "@/lib/server-settings";
import { readCurrentConnection } from "@/lib/current-connection";
import { readNodeCache, readSubscriptionUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getSettings();
  const [subscriptionUrl, cache, currentConnection] = await Promise.all([
    readSubscriptionUrl(),
    readNodeCache(),
    readCurrentConnection(),
  ]);

  return Response.json({
    ok: true,
    data: {
      settings,
      hasSubscription: Boolean(subscriptionUrl),
      subscriptionUrl,
      currentConnection,
      nodeCount: cache.nodes.length,
      updatedAt: cache.updatedAt,
    },
  });
}
