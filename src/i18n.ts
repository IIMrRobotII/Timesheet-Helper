import { storage } from './lib';
import type { SupportedLanguage, StorageSchema } from './types';

let currentLanguage: SupportedLanguage = 'en';
let messages: Record<string, string> = {};

export async function init(): Promise<void> {
  const res = (await storage.get([
    'currentLanguage',
  ])) as Partial<StorageSchema>;
  if (res.currentLanguage && ['en', 'he'].includes(res.currentLanguage)) {
    currentLanguage = res.currentLanguage as SupportedLanguage;
  } else {
    const browserLang = chrome.i18n.getUILanguage().split('-')[0] ?? 'en';
    currentLanguage = ['en', 'he'].includes(browserLang)
      ? (browserLang as SupportedLanguage)
      : 'en';
    await storage.set({ currentLanguage }).catch(() => {});
  }
  await loadMessages();
  setDocumentDirection();
}

async function loadMessages(): Promise<void> {
  try {
    const response = await fetch(
      chrome.runtime.getURL(`_locales/${currentLanguage}/messages.json`)
    );
    const data = (await response.json()) as Record<string, { message: string }>;
    messages = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.message || k])
    );
  } catch {
    messages = {};
  }
}

export function getMessage(key: string, subs: string[] = []): string {
  let msg = messages[key] || chrome.i18n.getMessage(key, subs) || key;
  subs.forEach((sub, i) => {
    msg = msg.replace(new RegExp(`\\$${i + 1}\\$`, 'g'), sub);
    if (i === 0)
      ['COUNT', 'CURRENT', 'DATE', 'START', 'SITE', 'INDEX'].forEach(p => {
        msg = msg.replace(new RegExp(`\\$${p}\\$`, 'g'), sub);
      });
    if (i === 1)
      ['TOTAL', 'END'].forEach(p => {
        msg = msg.replace(new RegExp(`\\$${p}\\$`, 'g'), sub);
      });
  });
  return msg;
}

export async function switchLanguage(
  lang: SupportedLanguage
): Promise<boolean> {
  if (!['en', 'he'].includes(lang)) return false;
  currentLanguage = lang;
  await storage.set({ currentLanguage }).catch(() => {});
  await loadMessages();
  setDocumentDirection();
  return true;
}

export const getCurrentLanguage = () => currentLanguage;
export const isRtl = () => currentLanguage === 'he';

export function setDocumentDirection(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLanguage;
  document.body.classList.toggle('rtl', isRtl());
}

export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return getMessage('statNever');
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000),
    hrs = Math.floor(diffMs / 3600000),
    days = Math.floor(diffMs / 86400000);
  if (mins < 1) return getMessage('timeFormatJustNow');
  if (mins < 60) return `${mins}${getMessage('timeFormatMinutesAgo')}`;
  if (hrs < 24) return `${hrs}${getMessage('timeFormatHoursAgo')}`;
  if (days < 7) return `${days}${getMessage('timeFormatDaysAgo')}`;
  return new Date(timestamp).toLocaleDateString(currentLanguage);
}

export function formatCounterValue(
  timestamp: string | null,
  count: number,
  failures = 0
): string {
  const successText =
    count === 1
      ? getMessage('timeFormatSingularTime')
      : getMessage('timeFormatPluralTimes');
  const failText =
    failures === 1
      ? getMessage('timeFormatSingularFail')
      : getMessage('timeFormatPluralFails');
  if (count === 0 && failures === 0) return getMessage('statNever');
  if (count > 0 && timestamp) {
    const time = formatTimestamp(timestamp);
    return failures > 0
      ? `${time} (${count} ${successText}, ${failures} ${failText})`
      : `${time} (${count} ${successText})`;
  }
  if (count === 0 && failures > 0)
    return `${getMessage('statNever')} (${failures} ${failText})`;
  return getMessage('statNever');
}

export const getErrorMessages = () => ({
  extensionDisabled: getMessage('errorExtensionDisabled'),
  wrongSite: getMessage('errorWrongSite'),
  noData: getMessage('errorNoData'),
  inProgress: getMessage('errorInProgress'),
  noTimeBoxes: getMessage('errorNoTimeBoxes'),
  copyFailed: getMessage('errorNoData'),
  pasteFailed: getMessage('errorNoData'),
  invalidAction: getMessage('errorUnknownAction'),
});

export const getWorkingMessages = () => ({
  copying: getMessage('workingCopying'),
  pasting: getMessage('workingPasting'),
  autoClick: getMessage('workingAutoClick'),
  clearing: getMessage('workingClearing'),
});
