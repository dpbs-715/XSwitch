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
    <header className="sticky top-0 z-30 border-b-2 border-[#24211c] bg-[#f7f4ed]/95 px-4 py-3 backdrop-blur lg:px-6">
      <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1fr_minmax(360px,520px)] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#736b5f]">
            <span>XS Switch</span>
            <span className="h-1 w-1 rounded-full bg-[#736b5f]" />
            <span>Server-local Xray control</span>
          </div>
          <h1 className="mt-1 truncate text-2xl font-black leading-none text-[#171714] sm:text-3xl">
            Xray 节点切换台
          </h1>
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="min-w-0 border border-[#26231d] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#d64b2a]"
              placeholder="管理密码"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
            <button
              className="border border-[#26231d] bg-[#26231d] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              disabled={busy !== null}
              onClick={onConnect}
            >
              连接
            </button>
          </div>
          <div className={`line-clamp-2 border px-3 py-2 text-xs ${toastClassName(toast.tone)}`}>
            {toast.message}
          </div>
        </div>
      </div>
    </header>
  );
}
