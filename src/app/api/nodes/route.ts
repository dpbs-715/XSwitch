import { assertAuthorized } from "@/lib/server-settings";
import { readNodeCache } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  return Response.json({
    ok: true,
    data: await readNodeCache(),
  });
}
