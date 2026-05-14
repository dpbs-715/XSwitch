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

function loadCurrentConnectionModule() {
  const filename = join(__dirname, "current-connection.ts");
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
    if (id === "./server-settings") {
      return {
        getSettings() {
          return {
            xrayConfigPath: "/tmp/xray.json",
            outboundTag: "proxy",
          };
        },
      };
    }

    if (id === "./storage") {
      return {
        async readNodeCache() {
          return { updatedAt: null, nodes: [] };
        },
      };
    }

    return require(id);
  };
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    require: testRequire,
  });

  vm.runInContext(compiled, context, { filename });
  return cjsModule.exports;
}

test("matches current vmess outbound to cached subscription node", () => {
  const { resolveCurrentConnection } = loadCurrentConnectionModule();

  const node = {
    id: "node-1",
    name: "HK 01",
    protocol: "vmess",
    address: "hk.example.com",
    port: 443,
    region: "香港",
    status: "unknown",
    raw: "",
    config: {
      id: "uuid-1",
      security: "auto",
      network: "ws",
      tls: "tls",
    },
  };

  const current = resolveCurrentConnection(
    {
      outbounds: [
        {
          tag: "proxy",
          protocol: "vmess",
          settings: {
            vnext: [
              {
                address: "hk.example.com",
                port: 443,
                users: [{ id: "uuid-1", security: "auto" }],
              },
            ],
          },
          streamSettings: {
            network: "ws",
            security: "tls",
          },
        },
      ],
    },
    [node],
    "proxy",
  );

  assert.equal(current.state, "matched");
  assert.equal(current.node.id, "node-1");
  assert.equal(current.outbound.address, "hk.example.com");
  assert.equal(current.outbound.port, 443);
});

test("summarizes unmatched current outbound without guessing subscription node", () => {
  const { resolveCurrentConnection } = loadCurrentConnectionModule();

  const current = resolveCurrentConnection(
    {
      outbounds: [
        {
          tag: "proxy",
          protocol: "trojan",
          settings: {
            servers: [
              {
                address: "manual.example.com",
                port: 8443,
                password: "secret",
              },
            ],
          },
          streamSettings: {
            network: "tcp",
            security: "tls",
          },
        },
      ],
    },
    [],
    "proxy",
  );

  assert.equal(current.state, "unmatched");
  assert.deepEqual(JSON.parse(JSON.stringify(current.outbound)), {
    tag: "proxy",
    protocol: "trojan",
    address: "manual.example.com",
    port: 8443,
    network: "tcp",
    security: "tls",
    auth: {
      password: "secret",
    },
  });
});

test("reports missing outbound when configured tag is absent", () => {
  const { resolveCurrentConnection } = loadCurrentConnectionModule();

  const current = resolveCurrentConnection(
    {
      outbounds: [{ tag: "direct", protocol: "freedom" }],
    },
    [],
    "proxy",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(current)), {
    state: "missing-outbound",
    outboundTag: "proxy",
  });
});
