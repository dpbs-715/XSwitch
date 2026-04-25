import type { AppSettings, SubscriptionNode } from "@/lib/types";

import { Detail } from "./detail";
import { StatusBadge } from "./status-badge";
import type { BusyState } from "./ui-types";

export function SelectedNodePanel({
  node,
  settings,
  busy,
  onTestNode,
  onSwitchNode,
}: {
  node: SubscriptionNode | undefined;
  settings: AppSettings | null;
  busy: BusyState;
  onTestNode: (id: string) => void;
  onSwitchNode: () => void;
}) {
  return (
    <aside className="grid gap-4 lg:sticky lg:top-[116px] lg:self-start">
      <section className="border-2 border-[#26231d] bg-white shadow-[6px_6px_0_#26231d]">
        {node ? (
          <div className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#736b5f]">
                  Selected
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-[#171714]">
                  {node.name}
                </h2>
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
                className="border border-[#26231d] bg-white px-4 py-3 text-sm font-black disabled:opacity-50"
                disabled={busy !== null}
                onClick={() => onTestNode(node.id)}
              >
                {busy === `test-${node.id}` ? "检测中" : "检测此节点"}
              </button>
              <button
                className="border border-[#26231d] bg-[#d64b2a] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                disabled={busy !== null}
                onClick={onSwitchNode}
              >
                {busy === "switch" ? "切换中" : "使用此节点"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <p className="max-w-sm text-lg font-black">
              保存订阅并刷新后，选择一个节点即可切换。
            </p>
          </div>
        )}
      </section>

      <section className="border border-[#26231d] bg-[#fffdf7] p-4">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#736b5f]">
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
