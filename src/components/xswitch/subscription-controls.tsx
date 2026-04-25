import type { BusyState } from "./ui-types";

export function SubscriptionControls({
  subscriptionUrl,
  busy,
  onSubscriptionChange,
  onSave,
  onRefresh,
}: {
  subscriptionUrl: string;
  busy: BusyState;
  onSubscriptionChange: (value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="border border-[#26231d] bg-[#fffdf7]">
      <div className="grid gap-3 p-3">
        <label className="grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#736b5f]">
            Subscription
          </span>
          <textarea
            className="min-h-16 resize-y border border-[#26231d] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#d64b2a]"
            placeholder="https://..."
            value={subscriptionUrl}
            onChange={(event) => onSubscriptionChange(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="border border-[#26231d] bg-white px-3 py-2 text-sm font-black disabled:opacity-50"
            disabled={busy !== null}
            onClick={onSave}
          >
            保存
          </button>
          <button
            className="border border-[#26231d] bg-[#d64b2a] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
            disabled={busy !== null}
            onClick={onRefresh}
          >
            {busy === "refresh" ? "刷新中" : "刷新订阅"}
          </button>
        </div>
      </div>
    </section>
  );
}
