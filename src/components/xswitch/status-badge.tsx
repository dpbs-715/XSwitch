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
      className={`inline-flex h-7 shrink-0 items-center border border-[#26231d] px-2 font-black ${
        large ? "text-sm" : "text-xs"
      } ${node.status === "online" ? "bg-[#14724d] text-white" : "bg-white text-[#171714]"}`}
    >
      {text}
    </span>
  );
}
