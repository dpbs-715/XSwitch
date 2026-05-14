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
  currentNodeId,
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
  currentNodeId: string | null;
  busy: BusyState;
  onQueryChange: (value: string) => void;
  onProtocolChange: (value: ProtocolFilter) => void;
  onSelect: (id: string) => void;
  onTestAll: () => void;
}) {
  return (
    <section className="panel node-pool flex min-h-[600px] flex-col overflow-hidden lg:h-[calc(100vh-230px)] lg:min-h-0">
      <div className="grid gap-3 border-b border-[#ded0bc] bg-[#fffaf2] p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black leading-none text-[#171714]">
              节点池
            </h2>
            <p className="mt-1 font-mono text-xs font-bold tabular-nums text-[#6f675c]">
              {nodes.length} / {totalCount} nodes
            </p>
          </div>
          <button
            className="btn btn-secondary min-h-9 px-3 text-xs"
            disabled={busy !== null || totalCount === 0}
            onClick={onTestAll}
          >
            {busy === "test-all" ? "检测中…" : "检测全部"}
          </button>
        </div>
        <div>
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
              id={`node-${node.id}`}
              className={`node-row [content-visibility:auto] ${
                selectedId === node.id ? "node-row-active" : "bg-[#fffdf7]"
              }`}
              key={node.id}
              onClick={() => onSelect(node.id)}
            >
              <span className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="block min-w-0 truncate text-sm font-black">
                    {node.name}
                  </span>
                  {currentNodeId === node.id ? (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-[#14724d] bg-[#edf8f1] px-2 text-[11px] font-black text-[#145b3f]">
                      使用中
                    </span>
                  ) : null}
                </span>
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
