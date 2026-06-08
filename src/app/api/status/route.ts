import { getSettings } from "@/lib/server-settings";
import { readCurrentConnection } from "@/lib/current-connection";
import {
  readNodeCache,
  readSubscriptionSources,
  readSubscriptionUrl,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getSettings();
  const [subscriptionUrl, subscriptionSources, cache, currentConnection] =
    await Promise.all([
      readSubscriptionUrl(),
      readSubscriptionSources(),
      readNodeCache(),
      readCurrentConnection(),
    ]);

  return Response.json({
    ok: true,
    data: {
      settings,
      hasSubscription: Boolean(subscriptionUrl),
      subscriptionUrl,
      subscriptionSources,
      currentConnection,
      nodeCount: cache.nodes.length,
      updatedAt: cache.updatedAt,
    },
  });
}
