export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#e1d4c0] bg-white/70 p-3">
      <span className="label-kicker block text-[11px]">
        {label}
      </span>
      <span className="mt-1 block break-words font-mono text-sm font-black leading-5 text-[#171714]">
        {value}
      </span>
    </div>
  );
}
