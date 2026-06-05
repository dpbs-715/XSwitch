import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadSubscriptionModule(options = {}) {
  const filename = join(__dirname, "subscription.ts");
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  const cjsModule = { exports: {} };
  const testRequire = (id) => {
    if (id === "undici" && options.undici) {
      return options.undici;
    }
    return require(id);
  };

  const context = vm.createContext({
    Buffer,
    AbortSignal,
    Response,
    URL,
    fetch: options.fetchImpl,
    module: cjsModule,
    exports: cjsModule.exports,
    process: {
      env: options.env ?? {},
    },
    require: testRequire,
  });

  vm.runInContext(compiled, context, { filename });
  return cjsModule.exports;
}

const { parseSubscription, toXrayOutbound } = loadSubscriptionModule();

test("configured subscription proxy is passed to fetch", async () => {
  const fetchCalls = [];
  const proxyUrls = [];
  const { fetchSubscription: fetchWithProxy } = loadSubscriptionModule({
    env: {
      XSWITCH_SUBSCRIPTION_PROXY: "http://127.0.0.1:7890",
    },
    fetchImpl: async (_url, init) => {
      fetchCalls.push(init);
      return new Response("trojan://password@example.com:443#Proxy");
    },
    undici: {
      ProxyAgent: class TestProxyAgent {
        constructor(proxyUrl) {
          this.proxyUrl = proxyUrl;
          proxyUrls.push(proxyUrl);
        }
      },
    },
  });

  await fetchWithProxy("https://subscription.example.com/sub");

  assert.equal(proxyUrls[0], "http://127.0.0.1:7890");
  assert.equal(fetchCalls[0].dispatcher.proxyUrl, "http://127.0.0.1:7890");
});

test("trojan peer URL parameters become Xray TLS stream settings", () => {
  const [node] = parseSubscription(
    "trojan://test-trojan-password@trojan.example.com:20001?allowInsecure=1&peer=tls-peer.example.com&tfo=1&pinnedPeerCertSha256=abc123#Trojan",
  );

  const outbound = toXrayOutbound(node, "proxy");

  assert.deepEqual(JSON.parse(JSON.stringify(outbound.streamSettings)), {
    network: "tcp",
    security: "tls",
    tlsSettings: {
      serverName: "tls-peer.example.com",
      pinnedPeerCertSha256: ["abc123"],
    },
    sockopt: {
      tcpFastOpen: true,
    },
  });
});

test("cached trojan peer parameters still become Xray TLS stream settings", () => {
  const outbound = toXrayOutbound(
    {
      id: "cached-node",
      name: "cached trojan",
      protocol: "trojan",
      address: "cached-trojan.example.com",
      port: 20059,
      region: "韩国",
      status: "unknown",
      raw: "",
      config: {
        password: "test-trojan-password",
        network: "tcp",
        peer: "tls-peer.example.com",
        allowInsecure: "1",
        pinnedPeerCertSha256: "abc123,def456",
        tfo: "1",
      },
    },
    "proxy",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(outbound.streamSettings)), {
    network: "tcp",
    security: "tls",
    tlsSettings: {
      serverName: "tls-peer.example.com",
      pinnedPeerCertSha256: ["abc123", "def456"],
    },
    sockopt: {
      tcpFastOpen: true,
    },
  });
});

test("vless reality URL parameters become Xray reality settings", () => {
  const [node] = parseSubscription(
    "vless://00000000-0000-4000-8000-000000000001@reality.example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=reality-peer.example.com&fp=chrome&pbk=test-public-key&sid=0123abcd&spx=%2Fsearch%3Fq%3Dxswitch&type=tcp#Reality",
  );

  const outbound = toXrayOutbound(node, "proxy");

  assert.deepEqual(JSON.parse(JSON.stringify(outbound)), {
    tag: "proxy",
    protocol: "vless",
    settings: {
      vnext: [
        {
          address: "reality.example.com",
          port: 443,
          users: [
            {
              id: "00000000-0000-4000-8000-000000000001",
              encryption: "none",
              flow: "xtls-rprx-vision",
            },
          ],
        },
      ],
    },
    streamSettings: {
      network: "tcp",
      security: "reality",
      realitySettings: {
        serverName: "reality-peer.example.com",
        publicKey: "test-public-key",
        shortId: "0123abcd",
        fingerprint: "chrome",
        spiderX: "/search?q=xswitch",
      },
    },
  });
});

test("vless TLS URL keeps client fingerprint and ALPN", () => {
  const [node] = parseSubscription(
    "vless://00000000-0000-4000-8000-000000000001@tls.example.com:443?encryption=none&security=tls&sni=edge.example.com&fp=chrome&alpn=h2%2Chttp%2F1.1&type=ws&host=edge.example.com&path=%2Fws#TLS",
  );

  const outbound = toXrayOutbound(node, "proxy");

  assert.deepEqual(JSON.parse(JSON.stringify(outbound.streamSettings)), {
    network: "ws",
    security: "tls",
    tlsSettings: {
      serverName: "edge.example.com",
      alpn: ["h2", "http/1.1"],
      fingerprint: "chrome",
    },
    wsSettings: {
      path: "/ws",
      headers: {
        Host: "edge.example.com",
      },
    },
  });
});
