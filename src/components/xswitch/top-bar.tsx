import type { BusyState, Toast } from "./ui-types";
import { toastClassName } from "./format";

export function TopBar({
  password,
  toast,
  busy,
  onPasswordChange,
  onConnect,
}: {
  password: string;
  toast: Toast;
  busy: BusyState;
  onPasswordChange: (value: string) => void;
  onConnect: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#cfc1ad] bg-[#fbf7ef]/94 px-4 py-2.5 backdrop-blur lg:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-3 lg:grid-cols-[1fr_minmax(360px,500px)] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#736b5f]">
            <span translate="no">XS Switch</span>
            <span className="h-1 w-1 rounded-full bg-[#736b5f]" />
            <span>Server-local Xray control</span>
          </div>
          <h1 className="mt-1 text-balance text-xl font-black leading-none text-[#171714] sm:text-2xl">
            Xray 节点切换台
          </h1>
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="sr-only" htmlFor="admin-password">
              管理密码
            </label>
            <input
              autoComplete="current-password"
              className="control-input"
              id="admin-password"
              name="admin-password"
              placeholder="管理密码…"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
            <button
              className="btn btn-primary px-4"
              disabled={busy !== null}
              onClick={onConnect}
            >
              {busy !== null ? "处理中…" : "连接面板"}
            </button>
          </div>
          <div
            aria-live="polite"
            className={`line-clamp-1 rounded-md border px-3 py-1.5 text-xs ${toastClassName(toast.tone)}`}
            role="status"
          >
            {toast.message}
          </div>
        </div>
      </div>
    </header>
  );
}
