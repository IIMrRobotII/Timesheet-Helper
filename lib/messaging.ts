import type { ExtensionMessage, ExtensionResponse } from "./types";

const TIMEOUT_MS = 30000;

export async function sendToActiveTab(message: ExtensionMessage): Promise<ExtensionResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("NO_TAB");
  const send = chrome.tabs.sendMessage<ExtensionMessage, ExtensionResponse>(tab.id, message);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("COMMUNICATION_TIMEOUT")), TIMEOUT_MS);
  });
  return Promise.race([send, timeout]);
}

export async function activeTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? "";
}
