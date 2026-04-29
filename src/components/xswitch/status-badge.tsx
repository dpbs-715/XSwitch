import type { SubscriptionNode } from "@/lib/types";

export function StatusBadge({
  node,
  large = false,
}: {
  node: SubscriptionNode;
  large?: boolean;
}) {
  const text =
    node.status === "online"
      ? `${node.latencyMs ?? "-"} ms`
      : node.status === "offline"
        ? "离线"
        : "未知";

  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-md border px-2 font-mono font-black tabular-nums ${
        large ? "text-sm" : "text-xs"
      } ${node.status === "online" ? "border-[#14724d] bg-[#14724d] text-white" : "border-[#d8cdbb] bg-white text-[#171714]"}`}
    >
      {text}
    </span>
  );
}
