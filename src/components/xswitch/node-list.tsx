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
    <section className="panel flex min-h-[560px] flex-col overflow-hidden lg:h-[calc(100vh-250px)] lg:min-h-0">
      <div className="grid gap-3 border-b border-[#e3d6c3] bg-[#fffaf2] p-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="sr-only" htmlFor="node-search">
            搜索节点
          </label>
          <input
            autoComplete="off"
            className="control-input"
            id="node-search"
            name="node-search"
            placeholder="搜索名称、地区、地址…"
            spellCheck={false}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <button
            className="btn btn-secondary px-3 text-xs"
            disabled={busy !== null || totalCount === 0}
            onClick={onTestAll}
          >
            {busy === "test-all" ? "检测中…" : "检测全部"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {protocols.map((item) => (
            <button
              aria-pressed={protocol === item}
              className={`border px-2 py-2 text-xs font-black transition-[background-color,color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(214,75,42,0.22)] ${
                protocol === item
                  ? "border-[#26231d] bg-[#26231d] text-white"
                  : "border-[#d8cdbb] bg-white text-[#413b32] hover:border-[#26231d] hover:bg-[#fff5e7]"
              }`}
              key={item}
              onClick={() => onProtocolChange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="font-mono text-xs font-bold tabular-nums text-[#5e574d]">
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
              className={`node-row [content-visibility:auto] ${
                selectedId === node.id ? "node-row-active" : "bg-[#fffdf7]"
              }`}
              key={node.id}
              onClick={() => onSelect(node.id)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{node.name}</span>
                <span className="mt-1 block truncate font-mono text-xs text-[#655e54]">
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
