"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiResult, AppSettings, NodeCache, SubscriptionNode } from "@/lib/types";

type StatusPayload = {
  settings: AppSettings;
  hasSubscription: boolean;
  subscriptionUrl: string | null;
  nodeCount: number;
  updatedAt: string | null;
};

type Toast = {
  tone: "ok" | "error" | "info";
  message: string;
};

export default function Home() {
  const [password, setPassword] = useState("");
  const [subscriptionUrl, setSubscriptionUrl] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [nodes, setNodes] = useState<SubscriptionNode[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [protocol, setProtocol] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>({
    tone: "info",
    message: "准备连接服务器面板。",
  });

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? nodes[0],
    [nodes, selectedId],
  );

  const filteredNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesProtocol = protocol === "all" || node.protocol === protocol;
      const matchesQuery =
        !needle ||
        [node.name, node.address, node.region, node.protocol]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesProtocol && matchesQuery;
    });
  }, [nodes, protocol, query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedPassword = window.localStorage.getItem("xswitch-password") ?? "";
      setPassword(savedPassword);
      void loadStatus(savedPassword);
      void loadNodes(savedPassword);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-admin-password": password,
        ...(init?.headers ?? {}),
      },
    });
    const payload = (await response.json()) as ApiResult<T>;
    if (!payload.ok) {
      throw new Error(payload.error);
    }
    return payload.data;
  }

  async function loadStatus(nextPassword = password) {
    try {
      const response = await fetch("/api/status", {
        headers: { "x-admin-password": nextPassword },
      });
      const payload = (await response.json()) as ApiResult<StatusPayload>;
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      setSettings(payload.data.settings);
      setSubscriptionUrl(payload.data.subscriptionUrl ?? "");
      setUpdatedAt(payload.data.updatedAt);
      setToast({
        tone: "ok",
        message: payload.data.hasSubscription
          ? "已读取服务器状态。"
          : "请先保存订阅链接。",
      });
    } catch (error) {
      setToast(toErrorToast(error));
    }
  }

  async function loadNodes(nextPassword = password) {
    try {
      const response = await fetch("/api/nodes", {
        headers: { "x-admin-password": nextPassword },
      });
      const payload = (await response.json()) as ApiResult<NodeCache>;
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      setNodes(payload.data.nodes);
      setUpdatedAt(payload.data.updatedAt);
      setSelectedId((current) => current ?? payload.data.nodes[0]?.id ?? null);
    } catch {
      setNodes([]);
    }
  }

  async function savePassword() {
    window.localStorage.setItem("xswitch-password", password);
    await loadStatus(password);
    await loadNodes(password);
  }

  async function saveSubscription() {
    await runBusy("save", async () => {
      await api<{ url: string }>("/api/subscription", {
        method: "POST",
        body: JSON.stringify({ url: subscriptionUrl }),
      });
      setToast({ tone: "ok", message: "订阅链接已保存。" });
    });
  }

  async function refreshSubscription() {
    await runBusy("refresh", async () => {
      const payload = await api<{ nodes: SubscriptionNode[]; updatedAt: string }>(
        "/api/refresh",
        {
          method: "POST",
          body: JSON.stringify({ url: subscriptionUrl }),
        },
      );
      setNodes(payload.nodes);
      setUpdatedAt(payload.updatedAt);
      setSelectedId(payload.nodes[0]?.id ?? null);
      setToast({ tone: "ok", message: `已刷新 ${payload.nodes.length} 个节点。` });
    });
  }

  async function testNodes(id?: string) {
    await runBusy(id ? `test-${id}` : "test-all", async () => {
      const payload = await api<{ nodes: SubscriptionNode[]; updatedAt: string }>(
        "/api/test",
        {
          method: "POST",
          body: JSON.stringify({ id }),
        },
      );
      setNodes(payload.nodes);
      setUpdatedAt(payload.updatedAt);
      setToast({ tone: "ok", message: id ? "节点检测完成。" : "批量检测完成。" });
    });
  }

  async function switchNode() {
    if (!selectedNode) {
      return;
    }

    await runBusy("switch", async () => {
      const payload = await api<{
        backupPath: string;
        configPath: string;
        outboundTag: string;
      }>("/api/switch", {
        method: "POST",
        body: JSON.stringify({ id: selectedNode.id }),
      });
      setToast({
        tone: "ok",
        message: `已切换 ${selectedNode.name}，备份：${payload.backupPath}`,
      });
    });
  }

  async function runBusy(name: string, action: () => Promise<void>) {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      setToast(toErrorToast(error));
    } finally {
      setBusy(null);
    }
  }

  const onlineCount = nodes.filter((node) => node.status === "online").length;
  const offlineCount = nodes.filter((node) => node.status === "offline").length;

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#171714]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        <header className="grid gap-5 border-b border-[#26231d] pb-5 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#736b5f]">
              <span>XS Switch</span>
              <span className="h-1 w-1 rounded-full bg-[#736b5f]" />
              <span>Server-local Xray control</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none sm:text-6xl">
              Xray 节点切换台
            </h1>
          </div>

          <div className="grid gap-3 text-sm">
            <label className="grid gap-2">
              <span className="font-bold">管理密码</span>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 border border-[#26231d] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#d64b2a]"
                  placeholder="XSWITCH_ADMIN_PASSWORD"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="border border-[#26231d] bg-[#26231d] px-4 py-2 font-bold text-white disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={savePassword}
                >
                  连接
                </button>
              </div>
            </label>
            <div className={`border px-3 py-2 ${toastClassName(toast.tone)}`}>
              {toast.message}
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[420px_1fr]">
          <aside className="flex min-h-[620px] flex-col border border-[#26231d] bg-[#fffdf7]">
            <div className="border-b border-[#26231d] p-4">
              <label className="grid gap-2">
                <span className="text-sm font-black">订阅链接</span>
                <textarea
                  className="min-h-24 resize-none border border-[#26231d] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#d64b2a]"
                  placeholder="https://..."
                  value={subscriptionUrl}
                  onChange={(event) => setSubscriptionUrl(event.target.value)}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="border border-[#26231d] bg-white px-3 py-2 text-sm font-black disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={saveSubscription}
                >
                  保存
                </button>
                <button
                  className="border border-[#26231d] bg-[#d64b2a] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={refreshSubscription}
                >
                  {busy === "refresh" ? "刷新中" : "刷新订阅"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b border-[#26231d] p-4">
              <input
                className="border border-[#26231d] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d64b2a]"
                placeholder="搜索名称、地区、地址"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="grid grid-cols-5 gap-1">
                {["all", "vmess", "vless", "trojan", "ss"].map((item) => (
                  <button
                    className={`border border-[#26231d] px-2 py-2 text-xs font-black ${
                      protocol === item ? "bg-[#26231d] text-white" : "bg-white"
                    }`}
                    key={item}
                    onClick={() => setProtocol(item)}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-[#26231d] px-4 py-3 text-xs font-bold text-[#5e574d]">
              <span>{filteredNodes.length} / {nodes.length} 节点</span>
              <button
                className="border border-[#26231d] bg-white px-3 py-1 font-black text-[#171714] disabled:opacity-50"
                disabled={busy !== null || nodes.length === 0}
                onClick={() => testNodes()}
              >
                {busy === "test-all" ? "检测中" : "检测全部"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {filteredNodes.map((node) => (
                <button
                  className={`grid w-full grid-cols-[1fr_auto] gap-3 border-b border-[#e2d8c9] p-4 text-left ${
                    selectedNode?.id === node.id ? "bg-[#efe3cf]" : "bg-[#fffdf7]"
                  }`}
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{node.name}</span>
                    <span className="mt-1 block truncate text-xs text-[#655e54]">
                      {node.protocol.toUpperCase()} · {node.region} · {node.address}:{node.port}
                    </span>
                  </span>
                  <StatusBadge node={node} />
                </button>
              ))}
            </div>
          </aside>

          <section className="grid gap-5 lg:grid-rows-[auto_1fr]">
            <div className="grid gap-3 border border-[#26231d] bg-[#26231d] p-4 text-white md:grid-cols-4">
              <Metric label="节点总数" value={String(nodes.length)} />
              <Metric label="在线" value={String(onlineCount)} />
              <Metric label="离线" value={String(offlineCount)} />
              <Metric label="更新时间" value={formatDate(updatedAt)} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <article className="border border-[#26231d] bg-white p-5">
                {selectedNode ? (
                  <div className="grid gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#736b5f]">
                          Selected outbound
                        </p>
                        <h2 className="mt-2 text-3xl font-black leading-tight">
                          {selectedNode.name}
                        </h2>
                      </div>
                      <StatusBadge node={selectedNode} large />
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Detail label="协议" value={selectedNode.protocol.toUpperCase()} />
                      <Detail label="地区" value={selectedNode.region} />
                      <Detail label="地址" value={selectedNode.address} />
                      <Detail label="端口" value={String(selectedNode.port)} />
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="border border-[#26231d] bg-white px-4 py-2 font-black disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => testNodes(selectedNode.id)}
                      >
                        {busy === `test-${selectedNode.id}` ? "检测中" : "检测此节点"}
                      </button>
                      <button
                        className="border border-[#26231d] bg-[#d64b2a] px-5 py-2 font-black text-white disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={switchNode}
                      >
                        {busy === "switch" ? "切换中" : "使用此节点"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-80 place-items-center text-center">
                    <p className="max-w-sm text-lg font-black">
                      还没有节点。保存订阅后刷新即可开始。
                    </p>
                  </div>
                )}
              </article>

              <aside className="border border-[#26231d] bg-[#fffdf7] p-5">
                <h3 className="text-lg font-black">服务器配置</h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <Detail label="配置文件" value={settings?.xrayConfigPath ?? "-"} />
                  <Detail label="Outbound Tag" value={settings?.outboundTag ?? "-"} />
                  <Detail
                    label="重启命令"
                    value={settings?.restartCommand ?? "已关闭"}
                  />
                  <Detail
                    label="鉴权"
                    value={settings?.authEnabled ? "已启用" : "未启用"}
                  />
                </dl>
                <div className="mt-5 border-t border-[#26231d] pt-4 text-sm leading-6 text-[#5f574d]">
                  面板建议只监听服务器的 127.0.0.1，通过 SSH 隧道访问。切换前会自动备份为
                  <span className="font-bold text-[#171714]"> config.json.bak</span>。
                </div>
              </aside>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function StatusBadge({
  node,
  large = false,
}: {
  node: SubscriptionNode;
  large?: boolean;
}) {
  const text =
    node.status === "online"
      ? `${node.latencyMs ?? "-"} ms`
      : node.status === "offline"
        ? "离线"
        : "未知";

  return (
    <span
      className={`whitespace-nowrap border border-[#26231d] px-2 py-1 font-black ${
        large ? "text-sm" : "text-xs"
      } ${node.status === "online" ? "bg-[#1d7a55] text-white" : "bg-white text-[#171714]"}`}
    >
      {text}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8cdbb]">
        {label}
      </div>
      <div className="mt-2 truncate text-2xl font-black">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-[#d8cdbb] bg-[#fffdf7] p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#736b5f]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-black">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toErrorToast(error: unknown): Toast {
  return {
    tone: "error",
    message: error instanceof Error ? error.message : "操作失败。",
  };
}

function toastClassName(tone: Toast["tone"]) {
  if (tone === "ok") {
    return "border-[#1d7a55] bg-[#edf8f1] text-[#145b3f]";
  }
  if (tone === "error") {
    return "border-[#b42318] bg-[#fff0ed] text-[#8a1b12]";
  }
  return "border-[#26231d] bg-white text-[#171714]";
}
