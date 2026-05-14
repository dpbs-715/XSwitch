"use client";

import { useEffect, useMemo, useState } from "react";

import { CurrentConnectionCard } from "@/components/xswitch/current-connection-card";
import { MetricsStrip } from "@/components/xswitch/metrics-strip";
import { MobileActionBar } from "@/components/xswitch/mobile-action-bar";
import { NodeList } from "@/components/xswitch/node-list";
import { SelectedNodePanel } from "@/components/xswitch/selected-node-panel";
import { SubscriptionControls } from "@/components/xswitch/subscription-controls";
import { TopBar } from "@/components/xswitch/top-bar";
import { toErrorToast } from "@/components/xswitch/format";
import type {
  BusyState,
  ProtocolFilter,
  StatusPayload,
  Toast,
} from "@/components/xswitch/ui-types";
import type {
  ApiResult,
  AppSettings,
  CurrentConnection,
  NodeCache,
  SubscriptionNode,
} from "@/lib/types";

export default function Home() {
  const [password, setPassword] = useState("");
  const [subscriptionUrl, setSubscriptionUrl] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentConnection, setCurrentConnection] =
    useState<CurrentConnection | null>(null);
  const [nodes, setNodes] = useState<SubscriptionNode[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [protocol, setProtocol] = useState<ProtocolFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
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

  const onlineCount = nodes.filter((node) => node.status === "online").length;
  const offlineCount = nodes.filter((node) => node.status === "offline").length;
  const currentNodeId =
    currentConnection?.state === "matched" ? currentConnection.node.id : null;

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
      setCurrentConnection(payload.data.currentConnection);
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
      if (!id || id === currentNodeId) {
        await loadStatus();
      }
    });
  }

  async function testCurrentConnection() {
    await runBusy("test-current", async () => {
      const payload = await api<{
        currentConnection: CurrentConnection;
        nodes: SubscriptionNode[];
        updatedAt: string | null;
      }>("/api/test", {
        method: "POST",
        body: JSON.stringify({ current: true }),
      });
      setCurrentConnection(payload.currentConnection);
      setNodes(payload.nodes);
      setUpdatedAt(payload.updatedAt);
      setToast({ tone: "ok", message: "当前连接检测完成。" });
    });
  }

  function locateCurrentNode(id: string) {
    setSelectedId(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`node-${id}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
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
      await loadStatus();
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

  return (
    <main className="page-shell min-h-screen overflow-x-hidden pb-24 text-[#171714] lg:pb-6">
      <a className="skip-link" href="#main-content">
        跳到节点列表
      </a>
      <TopBar
        busy={busy}
        password={password}
        toast={toast}
        onConnect={savePassword}
        onPasswordChange={setPassword}
      />

      <section
        className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] lg:px-6"
        id="main-content"
      >
        <div className="grid gap-4 lg:min-h-0">
          <SubscriptionControls
            busy={busy}
            subscriptionUrl={subscriptionUrl}
            onRefresh={refreshSubscription}
            onSave={saveSubscription}
            onSubscriptionChange={setSubscriptionUrl}
          />

          <NodeList
            busy={busy}
            nodes={filteredNodes}
            currentNodeId={currentNodeId}
            protocol={protocol}
            query={query}
            selectedId={selectedNode?.id ?? null}
            totalCount={nodes.length}
            onProtocolChange={setProtocol}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
            onTestAll={() => testNodes()}
          />
        </div>

        <div className="grid gap-4">
          <MetricsStrip
            nodeCount={nodes.length}
            offlineCount={offlineCount}
            onlineCount={onlineCount}
            updatedAt={updatedAt}
          />

          <CurrentConnectionCard
            busy={busy}
            currentConnection={currentConnection}
            onLocateNode={locateCurrentNode}
            onTestCurrent={testCurrentConnection}
          />

          <SelectedNodePanel
            busy={busy}
            currentNodeId={currentNodeId}
            node={selectedNode}
            settings={settings}
            onSwitchNode={switchNode}
            onTestNode={(id) => testNodes(id)}
          />
        </div>
      </section>

      <MobileActionBar
        busy={busy}
        currentNodeId={currentNodeId}
        node={selectedNode}
        onSwitchNode={switchNode}
        onTestNode={(id) => testNodes(id)}
      />
    </main>
  );
}
