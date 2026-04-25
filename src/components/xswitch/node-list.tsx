import type { SubscriptionNode } from "@/lib/types";

import { StatusBadge } from "./status-badge";
import type { BusyState, ProtocolFilter } from "./ui-types";

const protocols: ProtocolFilter[] = ["all", "vmess", "vless", "trojan", "ss"];

export function NodeList({
  nodes,
  totalCount,
  query,
  protocol,
  selectedId,
  busy,
  onQueryChange,
  onProtocolChange,
  onSelect,
  onTestAll,
}: {
  nodes: SubscriptionNode[];
  totalCount: number;
  query: string;
  protocol: ProtocolFilter;
  selectedId: string | null;
  busy: BusyState;
  onQueryChange: (value: string) => void;
  onProtocolChange: (value: ProtocolFilter) => void;
  onSelect: (id: string) => void;
  onTestAll: () => void;
}) {
  return (
    <section className="flex min-h-[560px] flex-col border border-[#26231d] bg-[#fffdf7] lg:h-[calc(100vh-250px)] lg:min-h-0">
      <div className="grid gap-3 border-b border-[#26231d] p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="min-w-0 border border-[#26231d] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d64b2a]"
            placeholder="搜索名称、地区、地址"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button
            className="border border-[#26231d] bg-white px-3 py-2 text-xs font-black disabled:opacity-50"
            disabled={busy !== null || totalCount === 0}
            onClick={onTestAll}
          >
            {busy === "test-all" ? "检测中" : "检测全部"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {protocols.map((item) => (
            <button
              className={`border border-[#26231d] px-2 py-2 text-xs font-black ${
                protocol === item ? "bg-[#26231d] text-white" : "bg-white"
              }`}
              key={item}
              onClick={() => onProtocolChange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-[#5e574d]">
          {nodes.length} / {totalCount} 节点
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {nodes.length === 0 ? (
          <div className="grid h-full min-h-60 place-items-center p-6 text-center">
            <p className="max-w-xs text-sm font-black text-[#5f574d]">
              没有匹配节点
            </p>
          </div>
        ) : (
          nodes.map((node) => (
            <button
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#e2d8c9] p-3 text-left transition-colors hover:bg-[#f5ead8] ${
                selectedId === node.id ? "bg-[#efe3cf]" : "bg-[#fffdf7]"
              }`}
              key={node.id}
              onClick={() => onSelect(node.id)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{node.name}</span>
                <span className="mt-1 block truncate text-xs text-[#655e54]">
                  {node.protocol.toUpperCase()} · {node.region} · {node.address}:{node.port}
                </span>
              </span>
              <StatusBadge node={node} />
            </button>
          ))
        )}
      </div>
    </section>
  );
}
