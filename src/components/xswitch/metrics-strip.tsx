import { formatDate } from "./format";

export function MetricsStrip({
  nodeCount,
  onlineCount,
  offlineCount,
  updatedAt,
}: {
  nodeCount: number;
  onlineCount: number;
  offlineCount: number;
  updatedAt: string | null;
}) {
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-md border border-[#d8cdbb] bg-[#fffaf2] text-[#171714]">
      <Metric label="节点总数" value={String(nodeCount)} />
      <Metric label="在线" value={String(onlineCount)} />
      <Metric label="离线" value={String(offlineCount)} />
      <Metric label="更新时间" value={formatDate(updatedAt)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[#e3d6c3] p-2.5 last:border-r-0">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6f675c]">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-base font-black tabular-nums sm:text-lg">
        {value}
      </div>
    </div>
  );
}
