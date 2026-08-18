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
      pinnedPeerCertSha256: "abc123",
      fingerprint: "chrome",
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
      pinnedPeerCertSha256: "abc123,def456",
      fingerprint: "chrome",
    },
    sockopt: {
      tcpFastOpen: true,
    },
  });
});

test("switching to the same TLS server name preserves its verified certificate pin", () => {
  const [node] = parseSubscription(
    "trojan://test-password@new-edge.example.com:20001?allowInsecure=1&peer=tls-peer.example.com#Trojan",
  );
  const existingOutbound = {
    protocol: "trojan",
    settings: {
      servers: [{ address: "old-edge.example.com", port: 20000 }],
    },
    streamSettings: {
      security: "tls",
      tlsSettings: {
        serverName: "TLS-PEER.EXAMPLE.COM",
        pinnedPeerCertSha256: "verified-pin",
      },
    },
  };

  const outbound = toXrayOutbound(node, "proxy", existingOutbound);

  assert.equal(
    outbound.streamSettings.tlsSettings.pinnedPeerCertSha256,
    "verified-pin",
  );
  assert.equal("allowInsecure" in outbound.streamSettings.tlsSettings, false);
});

test("same TLS server name preserves an explicit ClientHello fingerprint", () => {
  const [node] = parseSubscription(
    "trojan://test-password@new-edge.example.com:20001?peer=tls-peer.example.com#Trojan",
  );
  const existingOutbound = {
    streamSettings: {
      security: "tls",
      tlsSettings: {
        serverName: "tls-peer.example.com",
        fingerprint: "firefox",
      },
    },
  };

  const outbound = toXrayOutbound(node, "proxy", existingOutbound);

  assert.equal(outbound.streamSettings.tlsSettings.fingerprint, "firefox");
});

test("TLS nodes explicitly default to the Chrome ClientHello fingerprint", () => {
  const [node] = parseSubscription(
    "trojan://test-password@edge.example.com:20001?peer=tls-peer.example.com#Trojan",
  );

  const outbound = toXrayOutbound(node, "proxy");

  assert.equal(outbound.streamSettings.tlsSettings.fingerprint, "chrome");
});

test("certificate pin is not reused for a different TLS server name", () => {
  const [node] = parseSubscription(
    "trojan://test-password@new-edge.example.com:20001?peer=new-peer.example.com#Trojan",
  );
  const existingOutbound = {
    streamSettings: {
      security: "tls",
      tlsSettings: {
        serverName: "old-peer.example.com",
        pinnedPeerCertSha256: "old-pin",
      },
    },
  };

  const outbound = toXrayOutbound(node, "proxy", existingOutbound);

  assert.equal(
    "pinnedPeerCertSha256" in outbound.streamSettings.tlsSettings,
    false,
  );
});

test("subscription certificate pin takes precedence over an existing pin", () => {
  const [node] = parseSubscription(
    "trojan://test-password@new-edge.example.com:20001?peer=tls-peer.example.com&pinnedPeerCertSha256=subscription-pin#Trojan",
  );
  const existingOutbound = {
    streamSettings: {
      security: "tls",
      tlsSettings: {
        serverName: "tls-peer.example.com",
        pinnedPeerCertSha256: "existing-pin",
      },
    },
  };

  const outbound = toXrayOutbound(node, "proxy", existingOutbound);

  assert.equal(
    outbound.streamSettings.tlsSettings.pinnedPeerCertSha256,
    "subscription-pin",
  );
});

test("subscription ClientHello fingerprint takes precedence over an existing one", () => {
  const [node] = parseSubscription(
    "trojan://test-password@new-edge.example.com:20001?peer=tls-peer.example.com&fp=edge#Trojan",
  );
  const existingOutbound = {
    streamSettings: {
      security: "tls",
      tlsSettings: {
        serverName: "tls-peer.example.com",
        fingerprint: "firefox",
      },
    },
  };

  const outbound = toXrayOutbound(node, "proxy", existingOutbound);

  assert.equal(outbound.streamSettings.tlsSettings.fingerprint, "edge");
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
