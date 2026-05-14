import type { CurrentConnection, CurrentConnectionHealth } from "@/lib/types";

import { formatDate } from "./format";
import type { BusyState } from "./ui-types";

export function CurrentConnectionCard({
  currentConnection,
  busy,
  onLocateNode,
  onTestCurrent,
}: {
  currentConnection: CurrentConnection | null;
  busy: BusyState;
  onLocateNode: (id: string) => void;
  onTestCurrent: () => void;
}) {
  const health = getHealth(currentConnection);
  const canTest =
    currentConnection?.state === "matched" || currentConnection?.state === "unmatched";
  const canLocate = currentConnection?.state === "matched";
  const title = getTitle(currentConnection);
  const endpoint = getEndpoint(currentConnection);
  const badge = getStateBadge(currentConnection);

  return (
    <section className="panel-current overflow-hidden border-[#26231d] bg-[#171714] text-white shadow-[8px_8px_0_rgba(38,35,29,0.18)]">
      <div className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f1b29d]">
              当前连接
            </p>
            <h2 className="mt-2 break-words text-2xl font-black leading-tight text-pretty">
              {title}
            </h2>
          </div>
          <span
            className={`inline-flex h-7 shrink-0 items-center rounded-md border px-2 text-xs font-black ${
              badge.tone === "ok"
                ? "border-[#70d3aa] bg-[#14724d] text-white"
                : badge.tone === "warn"
                  ? "border-[#f0c36e] bg-[#5c4420] text-[#ffe7af]"
                  : "border-[#f1b29d] bg-[#4a2420] text-[#ffd7cb]"
            }`}
          >
            {badge.text}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <DarkDetail label="端点" value={endpoint} />
          <DarkDetail label="健康" value={formatHealth(health)} />
          <DarkDetail label="最近检测" value={formatDate(health?.checkedAt ?? null)} />
          <DarkDetail label="来源" value={getSource(currentConnection)} />
        </div>

        {currentConnection?.state === "config-error" ? (
          <p className="rounded-md border border-[#8c4c3e] bg-[#2a1714] p-3 text-sm font-bold leading-6 text-[#ffd7cb]">
            {currentConnection.error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn border-[#f1b29d] bg-white text-[#171714] hover:bg-[#fff5e7]"
            disabled={busy !== null || !canTest}
            onClick={onTestCurrent}
          >
            {busy === "test-current" ? "检测中…" : "检测当前"}
          </button>
          <button
            className="btn border-[#f1b29d] bg-[#d64b2a] text-white hover:bg-[#a7381f]"
            disabled={busy !== null || !canLocate}
            onClick={() => {
              if (currentConnection?.state === "matched") {
                onLocateNode(currentConnection.node.id);
              }
            }}
          >
            定位节点
          </button>
        </div>
      </div>
    </section>
  );
}

function DarkDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#4a443a] bg-white/[0.06] p-3">
      <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#c7bdae]">
        {label}
      </span>
      <span className="mt-1 block break-words font-mono text-sm font-black leading-5 text-white">
        {value}
      </span>
    </div>
  );
}

function getHealth(
  currentConnection: CurrentConnection | null,
): CurrentConnectionHealth | undefined {
  if (!currentConnection) {
    return undefined;
  }

  if (currentConnection.state === "matched") {
    return (
      currentConnection.health ?? {
        status: currentConnection.node.status,
        latencyMs: currentConnection.node.latencyMs,
      }
    );
  }

  return currentConnection.state === "unmatched"
    ? currentConnection.health
    : undefined;
}

function getTitle(currentConnection: CurrentConnection | null) {
  if (!currentConnection) {
    return "正在读取";
  }

  if (currentConnection.state === "matched") {
    return currentConnection.node.name;
  }

  if (currentConnection.state === "unmatched") {
    return `${currentConnection.outbound.protocol.toUpperCase()} ${currentConnection.outbound.address}:${currentConnection.outbound.port}`;
  }

  if (currentConnection.state === "config-error") {
    return "配置读取失败";
  }

  return "未读取到 outbound";
}

function getEndpoint(currentConnection: CurrentConnection | null) {
  if (
    currentConnection?.state === "matched" ||
    currentConnection?.state === "unmatched"
  ) {
    return `${currentConnection.outbound.protocol.toUpperCase()} · ${currentConnection.outbound.address}:${currentConnection.outbound.port}`;
  }

  return "-";
}

function getSource(currentConnection: CurrentConnection | null) {
  if (!currentConnection) {
    return "-";
  }

  if (currentConnection.state === "matched") {
    return "已匹配订阅节点";
  }

  if (currentConnection.state === "unmatched") {
    return "未匹配订阅";
  }

  return currentConnection.outboundTag;
}

function getStateBadge(currentConnection: CurrentConnection | null) {
  if (!currentConnection) {
    return { text: "读取中", tone: "warn" as const };
  }

  if (currentConnection.state === "matched") {
    return { text: "已匹配", tone: "ok" as const };
  }

  if (currentConnection.state === "unmatched") {
    return { text: "未匹配", tone: "warn" as const };
  }

  return { text: "异常", tone: "error" as const };
}

function formatHealth(health: CurrentConnectionHealth | undefined) {
  if (health?.status === "online") {
    return `${health.latencyMs ?? "-"} ms`;
  }

  if (health?.status === "offline") {
    return "离线";
  }

  return "未知";
}
