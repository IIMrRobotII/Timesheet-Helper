import type { ExtensionMessage, ExtensionResponse } from "./types";

const TIMEOUT_MS = 30000;

export async function sendToTab(tabId: number, message: ExtensionMessage): Promise<ExtensionResponse> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("COMMUNICATION_TIMEOUT")), TIMEOUT_MS);
  });
  try {
    return await Promise.race([chrome.tabs.sendMessage<ExtensionMessage, ExtensionResponse>(tabId, message), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function sendToActiveTab(message: ExtensionMessage): Promise<ExtensionResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("NO_TAB");
  return sendToTab(tab.id, message);
}

export async function activeTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? "";
}
