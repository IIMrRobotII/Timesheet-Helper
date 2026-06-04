import { defineBackground } from "#imports";
import { detectSite, isShortcutCommand, resolveShortcut, SYNC_COMMAND } from "@/lib/sites";
import { runFullSync as runFullSyncCore } from "@/lib/full-sync";
import { activeTabUrl, sendToActiveTab, sendToTab } from "@/lib/messaging";
import { getSettings } from "@/lib/storage";
import type { ExtensionResponse, FullSyncResult } from "@/lib/types";

const BADGE_DURATION_MS = 2500;
const SUCCESS_COLOR = "#16a34a";
const PARTIAL_COLOR = "#d97706";
const ERROR_COLOR = "#dc2626";
const LOADING_COLOR = "#2563eb";
const LOADING_TEXT = "…";

async function flashBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => void chrome.action.setBadgeText({ text: "" }), BADGE_DURATION_MS);
}

async function setLoadingBadge(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: LOADING_COLOR });
  await chrome.action.setBadgeText({ text: LOADING_TEXT });
}

async function activateTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.update(tabId, { active: true });
  if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
}

async function currentWindowId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.windowId ?? null;
}

function badgeCount(response: ExtensionResponse): number {
  if (!response.success) return 0;
  if (response.action === "autoClickTimeBoxes") return response.clickedCount;
  if ("count" in response) return response.count;
  return 0;
}

async function isEnabled(): Promise<boolean> {
  const { extensionEnabled } = await getSettings();
  return extensionEnabled;
}

async function runShortcut(command: string): Promise<void> {
  const url = await activeTabUrl();
  if (!detectSite(url)) return;
  if (!(await isEnabled())) return void flashBadge("!", ERROR_COLOR);
  await setLoadingBadge();
  const action = resolveShortcut(command, url);
  if (!action) return void flashBadge("!", ERROR_COLOR);
  try {
    const response = await sendToActiveTab({ action });
    await flashBadge(
      response.success ? String(badgeCount(response)) : "!",
      response.success ? SUCCESS_COLOR : ERROR_COLOR
    );
  } catch {
    await flashBadge("!", ERROR_COLOR);
  }
}

async function runFullSync(): Promise<FullSyncResult> {
  return runFullSyncCore(
    {
      isEnabled,
      listTabs: () => chrome.tabs.query({}),
      activateTab,
      sendToTab,
    },
    await currentWindowId()
  );
}

function badgeForSync(result: FullSyncResult): Promise<void> {
  if (result.status === "synced") return flashBadge(String(result.pasted), SUCCESS_COLOR);
  if (result.status === "copiedNoMalam") return flashBadge(String(result.copied), PARTIAL_COLOR);
  return flashBadge("!", ERROR_COLOR);
}

async function fullSyncWithBadge(): Promise<FullSyncResult> {
  await setLoadingBadge();
  const result = await runFullSync();
  await badgeForSync(result);
  return result;
}

async function runSyncCommand(): Promise<void> {
  if (!detectSite(await activeTabUrl())) return;
  await fullSyncWithBadge();
}

export default defineBackground(() => {
  chrome.commands.onCommand.addListener(command => {
    if (command === SYNC_COMMAND) {
      void runSyncCommand();
      return;
    }
    if (isShortcutCommand(command)) void runShortcut(command);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.kind !== "fullSync") return;
    void fullSyncWithBadge().then(sendResponse);
    return true;
  });
});
