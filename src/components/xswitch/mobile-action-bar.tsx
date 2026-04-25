import type { SubscriptionNode } from "@/lib/types";

import type { BusyState } from "./ui-types";

export function MobileActionBar({
  node,
  busy,
  onTestNode,
  onSwitchNode,
}: {
  node: SubscriptionNode | undefined;
  busy: BusyState;
  onTestNode: (id: string) => void;
  onSwitchNode: () => void;
}) {
  if (!node) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#26231d] bg-[#fffdf7] p-3 shadow-[0_-6px_0_rgba(38,35,29,0.12)] lg:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{node.name}</div>
          <div className="truncate text-xs text-[#655e54]">
            {node.protocol.toUpperCase()} · {node.region}
          </div>
        </div>
        <button
          className="border border-[#26231d] bg-white px-3 py-2 text-xs font-black disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => onTestNode(node.id)}
        >
          检测
        </button>
        <button
          className="border border-[#26231d] bg-[#d64b2a] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          disabled={busy !== null}
          onClick={onSwitchNode}
        >
          使用
        </button>
      </div>
    </div>
  );
}
