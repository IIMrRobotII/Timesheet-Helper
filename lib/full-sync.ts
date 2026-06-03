import { ERROR_CODES, periodsMatch, pickTabForSite } from "./sites";
import type { ExtensionMessage, ExtensionResponse, FullSyncResult } from "./types";

export interface FullSyncTab {
  id?: number;
  url?: string;
  active?: boolean;
  windowId?: number;
}

export interface FullSyncPorts {
  isEnabled: () => Promise<boolean>;
  listTabs: () => Promise<readonly FullSyncTab[]>;
  activateTab: (tabId: number) => Promise<void>;
  sendToTab: (tabId: number, message: ExtensionMessage) => Promise<ExtensionResponse>;
}

type MonthCheck = "aligned" | "mismatch" | "hilanUnreadable" | "malamUnreadable";

async function checkMonths(
  ports: Pick<FullSyncPorts, "sendToTab">,
  hilanId: number,
  malamId: number
): Promise<MonthCheck> {
  const [hilan, malam] = await Promise.all([
    ports.sendToTab(hilanId, { action: "readMonth" }).catch(() => null),
    ports.sendToTab(malamId, { action: "readMonth" }).catch(() => null),
  ]);
  if (!hilan?.success || hilan.action !== "readMonth" || hilan.month === null) return "hilanUnreadable";
  if (!malam?.success || malam.action !== "readMonth" || malam.month === null) return "malamUnreadable";
  return periodsMatch({ month: hilan.month, year: hilan.year }, { month: malam.month, year: malam.year })
    ? "aligned"
    : "mismatch";
}

export async function runFullSync(ports: FullSyncPorts, preferredWindowId?: number | null): Promise<FullSyncResult> {
  if (!(await ports.isEnabled())) return { status: "error", code: ERROR_CODES.EXT_DISABLED };
  const tabs = await ports.listTabs();
  const hilanId = pickTabForSite(tabs, "HILAN", preferredWindowId);
  if (hilanId === null) return { status: "error", code: ERROR_CODES.NO_HILAN_TAB };
  const malamId = pickTabForSite(tabs, "MALAM", preferredWindowId);
  try {
    if (malamId !== null) {
      const months = await checkMonths(ports, hilanId, malamId);
      if (months === "hilanUnreadable") return { status: "error", code: ERROR_CODES.HILAN_MONTH_UNREADABLE };
      if (months === "malamUnreadable") return { status: "error", code: ERROR_CODES.MALAM_MONTH_UNREADABLE };
      if (months === "mismatch") return { status: "error", code: ERROR_CODES.MONTH_MISMATCH };
    }

    await ports.activateTab(hilanId);
    const copy = await ports.sendToTab(hilanId, { action: "autoClickAndCopy" });
    if (!copy.success) return { status: "error", code: copy.error.code };
    if (copy.action !== "autoClickAndCopy") return { status: "error", code: ERROR_CODES.UNEXPECTED_ERROR };

    if (malamId === null) return { status: "copiedNoMalam", copied: copy.count };

    await ports.activateTab(malamId);
    const paste = await ports.sendToTab(malamId, { action: "copyHours" });
    if (!paste.success) return { status: "error", code: paste.error.code };
    if (paste.action !== "copyHours") return { status: "error", code: ERROR_CODES.UNEXPECTED_ERROR };
    return { status: "synced", copied: copy.count, pasted: paste.count };
  } catch {
    return { status: "error", code: ERROR_CODES.UNEXPECTED_ERROR };
  }
}
