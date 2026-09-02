import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "./sites";
import { runFullSync, type FullSyncPorts } from "./full-sync";

const hilanTab = { id: 1, url: "https://foo.hilan.co.il/Hilannetv2/Attendance/" };
const malamTab = { id: 2, url: "https://payroll.malam.com/Salprd5Root/faces/" };

function ports(overrides: Partial<FullSyncPorts> = {}): FullSyncPorts {
  return {
    isEnabled: async () => true,
    listTabs: async () => [hilanTab, malamTab],
    activateTab: async () => {},
    sendToTab: async () => ({ success: true, action: "copyHours", count: 1 }),
    ...overrides,
  };
}

describe("runFullSync", () => {
  it("stops with EXT_DISABLED and touches no tabs when the extension is disabled", async () => {
    let listedTabs = false;
    const sent: number[] = [];

    const result = await runFullSync(
      ports({
        isEnabled: async () => false,
        listTabs: async () => {
          listedTabs = true;
          return [hilanTab, malamTab];
        },
        sendToTab: async tabId => {
          sent.push(tabId);
          return { success: true, action: "copyHours", count: 1 };
        },
      })
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.EXT_DISABLED });
    expect(listedTabs).toBe(false);
    expect(sent).toEqual([]);
  });

  it("stops before copying when Hilan and Malam months differ", async () => {
    const sent: number[] = [];

    const result = await runFullSync(
      ports({
        sendToTab: async tabId => {
          sent.push(tabId);
          return tabId === hilanTab.id
            ? { success: true, action: "readMonth", month: 5, year: 2026 }
            : { success: true, action: "readMonth", month: 6, year: 2026 };
        },
      })
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.MONTH_MISMATCH });
    expect(sent).toEqual([hilanTab.id, malamTab.id]);
  });

  it("stops before copying when Malam has no readable month", async () => {
    const actions: string[] = [];

    const result = await runFullSync(
      ports({
        sendToTab: async (tabId, message) => {
          actions.push(message.action);
          if (message.action === "readMonth") {
            return tabId === hilanTab.id
              ? { success: true, action: "readMonth", month: 5, year: 2026 }
              : { success: true, action: "readMonth", month: null, year: null };
          }
          if (message.action === "autoClickAndCopy") return { success: true, action: "autoClickAndCopy", count: 7 };
          return { success: true, action: "copyHours", count: 7 };
        },
      })
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.MALAM_MONTH_UNREADABLE });
    expect(actions).toEqual(["readMonth", "readMonth"]);
  });

  it("stops before copying when Hilan has no readable month", async () => {
    const actions: string[] = [];

    const result = await runFullSync(
      ports({
        sendToTab: async (tabId, message) => {
          actions.push(message.action);
          if (message.action === "readMonth") {
            return tabId === hilanTab.id
              ? { success: true, action: "readMonth", month: null, year: null }
              : { success: true, action: "readMonth", month: 5, year: 2026 };
          }
          if (message.action === "autoClickAndCopy") return { success: true, action: "autoClickAndCopy", count: 7 };
          return { success: true, action: "copyHours", count: 7 };
        },
      })
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.HILAN_MONTH_UNREADABLE });
    expect(actions).toEqual(["readMonth", "readMonth"]);
  });

  it("uses tabs from the preferred window when the same sites are open in multiple windows", async () => {
    const activated: number[] = [];
    const actions: Array<[number, string]> = [];
    const preferredHilan = { id: 11, url: hilanTab.url, windowId: 2 };
    const preferredMalam = { id: 21, url: malamTab.url, windowId: 2 };

    const result = await runFullSync(
      ports({
        listTabs: async () => [
          { id: 10, url: hilanTab.url, active: true, windowId: 1 },
          preferredHilan,
          { id: 20, url: malamTab.url, active: true, windowId: 1 },
          preferredMalam,
        ],
        activateTab: async tabId => {
          activated.push(tabId);
        },
        sendToTab: async (tabId, message) => {
          actions.push([tabId, message.action]);
          if (message.action === "readMonth") return { success: true, action: "readMonth", month: 5, year: 2026 };
          if (message.action === "autoClickAndCopy") return { success: true, action: "autoClickAndCopy", count: 7 };
          return { success: true, action: "copyHours", count: 7 };
        },
      }),
      2
    );

    expect(result).toEqual({ status: "synced", copied: 7, pasted: 7 });
    expect(activated).toEqual([preferredHilan.id, preferredMalam.id]);
    expect(actions.map(([tabId]) => tabId)).toEqual([
      preferredHilan.id,
      preferredMalam.id,
      preferredHilan.id,
      preferredMalam.id,
    ]);
  });

  it("syncs when Malam is on the reported portal timesheet URL", async () => {
    const portalTab = { id: 9, url: "https://portal.malam-payroll.com/Salprd5Root/faces/timesheet" };
    const activated: number[] = [];

    const result = await runFullSync(
      ports({
        listTabs: async () => [hilanTab, portalTab],
        activateTab: async tabId => {
          activated.push(tabId);
        },
        sendToTab: async (_tabId, message) => {
          if (message.action === "readMonth") return { success: true, action: "readMonth", month: 5, year: 2026 };
          if (message.action === "autoClickAndCopy") return { success: true, action: "autoClickAndCopy", count: 7 };
          return { success: true, action: "copyHours", count: 7 };
        },
      })
    );

    expect(result).toEqual({ status: "synced", copied: 7, pasted: 7 });
    expect(activated).toEqual([hilanTab.id, portalTab.id]);
  });

  it("copies Hilan data and returns a partial result when no Malam tab is open", async () => {
    const activated: number[] = [];

    const result = await runFullSync(
      ports({
        listTabs: async () => [hilanTab],
        activateTab: async tabId => {
          activated.push(tabId);
        },
        sendToTab: async () => ({ success: true, action: "autoClickAndCopy", count: 7 }),
      })
    );

    expect(result).toEqual({ status: "copiedNoMalam", copied: 7 });
    expect(activated).toEqual([hilanTab.id]);
  });

  it("returns the copy error code when Hilan copy fails", async () => {
    const result = await runFullSync(
      ports({
        sendToTab: async (_tabId, message) =>
          message.action === "readMonth"
            ? { success: true, action: "readMonth", month: 5, year: 2026 }
            : { success: false, error: { code: ERROR_CODES.COPY_FAILED } },
      })
    );

    expect(result).toEqual({ status: "error", code: ERROR_CODES.COPY_FAILED });
  });
});
