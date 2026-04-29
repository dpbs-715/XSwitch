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
    <section className="panel">
      <div className="grid gap-3 p-4">
        <label className="grid gap-1" htmlFor="subscription-url">
          <span className="label-kicker">
            Subscription
          </span>
          <textarea
            autoComplete="off"
            className="control-input min-h-20 resize-y"
            id="subscription-url"
            name="subscription-url"
            placeholder="https://example.com/sub…"
            spellCheck={false}
            value={subscriptionUrl}
            onChange={(event) => onSubscriptionChange(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={onSave}
          >
            {busy === "save" ? "保存中…" : "保存订阅"}
          </button>
          <button
            className="btn btn-primary"
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
