import type { SubscriptionNode } from "@/lib/types";

import type { BusyState } from "./ui-types";

export function MobileActionBar({
  node,
  busy,
  currentNodeId,
  onTestNode,
  onSwitchNode,
}: {
  node: SubscriptionNode | undefined;
  busy: BusyState;
  currentNodeId: string | null;
  onTestNode: (id: string) => void;
  onSwitchNode: () => void;
}) {
  if (!node) {
    return null;
  }

  return (
    <div className="mobile-safe-bar fixed inset-x-0 bottom-0 z-40 border-t border-[#d4c7b4] bg-[#fffdf7]/94 px-3 pt-3 shadow-[0_-16px_30px_rgba(58,44,25,0.12)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{node.name}</div>
          <div className="truncate font-mono text-xs text-[#655e54]">
            {node.id === currentNodeId ? "使用中 · " : ""}
            {node.protocol.toUpperCase()} · {node.region}
          </div>
        </div>
        <button
          className="btn btn-secondary min-h-9 px-3 py-2 text-xs"
          disabled={busy !== null}
          onClick={() => onTestNode(node.id)}
        >
          {busy === `test-${node.id}` ? "检测中…" : "检测"}
        </button>
        <button
          className="btn btn-primary min-h-9 px-3 py-2 text-xs"
          disabled={busy !== null}
          onClick={onSwitchNode}
        >
          {busy === "switch" ? "切换中…" : "使用"}
        </button>
      </div>
    </div>
  );
}
