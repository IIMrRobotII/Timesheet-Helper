import { afterEach, describe, expect, it, vi } from "vitest";
import { sendToTab } from "./messaging";
import type { ExtensionResponse } from "./types";

describe("sendToTab", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("clears the communication timeout after sendMessage resolves", async () => {
    vi.useFakeTimers();
    const response: ExtensionResponse = { success: true, action: "copyHours", count: 1 };
    const sendMessage = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("chrome", { tabs: { sendMessage } });

    await expect(sendToTab(1, { action: "copyHours" })).resolves.toEqual(response);

    expect(sendMessage).toHaveBeenCalledWith(1, { action: "copyHours" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
