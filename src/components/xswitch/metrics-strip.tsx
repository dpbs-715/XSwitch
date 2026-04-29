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
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#26231d] bg-[#26231d] text-white shadow-[var(--shadow)] sm:grid-cols-4">
      <Metric label="节点总数" value={String(nodeCount)} />
      <Metric label="在线" value={String(onlineCount)} />
      <Metric label="离线" value={String(offlineCount)} />
      <Metric label="更新时间" value={formatDate(updatedAt)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-r border-[#4b463c] p-3 last:border-r-0 sm:border-b-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d8cdbb]">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}
