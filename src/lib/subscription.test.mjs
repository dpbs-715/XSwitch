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

function loadSubscriptionModule() {
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
  const context = vm.createContext({
    Buffer,
    AbortSignal,
    URL,
    module: cjsModule,
    exports: cjsModule.exports,
    require,
  });

  vm.runInContext(compiled, context, { filename });
  return cjsModule.exports;
}

const { parseSubscription, toXrayOutbound } = loadSubscriptionModule();

test("trojan peer URL parameters become Xray TLS stream settings", () => {
  const [node] = parseSubscription(
    "trojan://d75db755-14df-474b-a883-c6fa0d1c3587@Hkdcrtc-e.catcat321.com:20001?allowInsecure=1&peer=kr.catxstar.com&tfo=1#%F0%9F%87%B0%F0%9F%87%B7%7C%E9%9F%A9%E5%9B%BD%E5%AE%B6%E5%AE%BD-IEPL%2002",
  );

  const outbound = toXrayOutbound(node, "proxy");

  assert.deepEqual(JSON.parse(JSON.stringify(outbound.streamSettings)), {
    network: "tcp",
    security: "tls",
    tlsSettings: {
      serverName: "kr.catxstar.com",
      allowInsecure: true,
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
      address: "oplosgru-c.catcat321.com",
      port: 20059,
      region: "韩国",
      status: "unknown",
      raw: "",
      config: {
        password: "d75db755-14df-474b-a883-c6fa0d1c3587",
        network: "tcp",
        peer: "kr.catxstar.com",
        allowInsecure: "1",
        tfo: "1",
      },
    },
    "proxy",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(outbound.streamSettings)), {
    network: "tcp",
    security: "tls",
    tlsSettings: {
      serverName: "kr.catxstar.com",
      allowInsecure: true,
    },
    sockopt: {
      tcpFastOpen: true,
    },
  });
});
