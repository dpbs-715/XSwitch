import type { Toast } from "./ui-types";

export function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toErrorToast(error: unknown): Toast {
  return {
    tone: "error",
    message: error instanceof Error ? error.message : "操作失败。",
  };
}

export function toastClassName(tone: Toast["tone"]) {
  if (tone === "ok") {
    return "border-[#1d7a55] bg-[#edf8f1] text-[#145b3f]";
  }
  if (tone === "error") {
    return "border-[#b42318] bg-[#fff0ed] text-[#8a1b12]";
  }
  return "border-[#26231d] bg-white text-[#171714]";
}
