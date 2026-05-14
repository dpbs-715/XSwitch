import type { AppSettings, SubscriptionNode } from "@/lib/types";

import { Detail } from "./detail";
import { StatusBadge } from "./status-badge";
import type { BusyState } from "./ui-types";

export function SelectedNodePanel({
  node,
  settings,
  busy,
  currentNodeId,
  onTestNode,
  onSwitchNode,
}: {
  node: SubscriptionNode | undefined;
  settings: AppSettings | null;
  busy: BusyState;
  currentNodeId: string | null;
  onTestNode: (id: string) => void;
  onSwitchNode: () => void;
}) {
  const isCurrentNode = Boolean(node && node.id === currentNodeId);

  return (
    <aside className="grid gap-4 lg:sticky lg:top-[116px] lg:self-start">
      <section className="panel border-[#26231d] bg-white shadow-[6px_6px_0_rgba(38,35,29,0.14)]">
        {node ? (
          <div className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="label-kicker">
                  选中节点
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-2xl font-black leading-tight text-[#171714] text-pretty">
                    {node.name}
                  </h2>
                  {isCurrentNode ? (
                    <span className="inline-flex h-7 items-center rounded-md border border-[#14724d] bg-[#edf8f1] px-2 text-xs font-black text-[#145b3f]">
                      正在使用
                    </span>
                  ) : null}
                </div>
              </div>
              <StatusBadge node={node} large />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Detail label="协议" value={node.protocol.toUpperCase()} />
              <Detail label="地区" value={node.region} />
              <Detail label="地址" value={node.address} />
              <Detail label="端口" value={String(node.port)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn btn-secondary px-4 py-3"
                disabled={busy !== null}
                onClick={() => onTestNode(node.id)}
              >
                {busy === `test-${node.id}` ? "检测中…" : "检测节点"}
              </button>
              <button
                className="btn btn-primary px-4 py-3"
                disabled={busy !== null}
                onClick={onSwitchNode}
              >
                {busy === "switch" ? "切换中…" : "使用节点"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <p className="max-w-sm text-lg font-black text-[#4c463d] text-pretty">
              保存订阅并刷新后，选择一个节点即可切换。
            </p>
          </div>
        )}
      </section>

      <section className="panel-muted p-4">
        <h3 className="label-kicker">
          Server
        </h3>
        <div className="mt-3 grid gap-2 text-sm">
          <Detail label="配置文件" value={settings?.xrayConfigPath ?? "-"} />
          <Detail label="Outbound Tag" value={settings?.outboundTag ?? "-"} />
          <Detail label="重启命令" value={settings?.restartCommand ?? "已关闭"} />
          <Detail label="鉴权" value={settings?.authEnabled ? "已启用" : "未启用"} />
        </div>
      </section>
    </aside>
  );
}
