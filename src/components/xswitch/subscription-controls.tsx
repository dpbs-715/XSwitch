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
    <section className="panel panel-quiet">
      <div className="grid gap-3 p-3.5">
        <label className="grid gap-1.5" htmlFor="subscription-url">
          <span className="flex items-center justify-between gap-3">
            <span className="label-kicker">订阅源</span>
            <span className="font-mono text-[11px] font-bold text-[#8d8375]">
              config input
            </span>
          </span>
          <textarea
            autoComplete="off"
            className="control-input min-h-14 resize-y lg:min-h-12"
            id="subscription-url"
            name="subscription-url"
            placeholder="https://example.com/sub…"
            spellCheck={false}
            value={subscriptionUrl}
            onChange={(event) => onSubscriptionChange(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            className="btn btn-secondary min-w-28"
            disabled={busy !== null}
            onClick={onSave}
          >
            {busy === "save" ? "保存中…" : "保存订阅"}
          </button>
          <button
            className="btn btn-primary min-w-28"
            disabled={busy !== null}
            onClick={onRefresh}
          >
            {busy === "refresh" ? "刷新中…" : "刷新节点"}
          </button>
        </div>
      </div>
    </section>
  );
}
