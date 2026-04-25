export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-[#d8cdbb] bg-[#fffdf7] p-3">
      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#736b5f]">
        {label}
      </span>
      <span className="mt-1 block break-words text-sm font-black leading-5 text-[#171714]">
        {value}
      </span>
    </div>
  );
}
