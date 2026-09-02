import type { ExtensionAction } from "./types";

export const SITES = {
  HILAN: {
    domains: ["hilan.co.il"],
    paths: ["/Hilannetv2/Attendance/", "/Hilannetv2/attendance/"],
    action: "copy",
  },
  MALAM: {
    domains: ["payroll.malam.com", "portal.malam-payroll.com"],
    paths: ["/Salprd5Root/faces/"],
    action: "paste",
  },
} as const;

export type SiteName = keyof typeof SITES;

export interface DetectedSite {
  name: SiteName;
  domains: readonly string[];
  paths: readonly string[];
  action: "copy" | "paste";
}

export const SELECTORS = {
  HILAN_TIME_BOXES:
    'td[class*="cDIES"], td[class*="cHD"], td[class*="cMAD"], td[class*="calendarAbcenseDay"], td[class*="calendarAbsenceDay"]',
  HILAN_DATE_CELL: 'td[id*="cellOf_ReportDate"]',
  HILAN_MONTH_LABEL: 'span[id*="calendar_monthChanged"]',
  HILAN_ENTRY_TIME: 'td[id*="cellOf_ManualEntry_EmployeeReports"]',
  HILAN_EXIT_TIME: 'td[id*="cellOf_ManualExit_EmployeeReports"]',
  HILAN_TOTAL: 'td[id*="cellOf_ManualTotal_EmployeeReports"]',
  HILAN_SYMBOL: 'select[id*="Symbol"]',
  HILAN_REPORT_TYPE: 'select[id*="Symbol.SymbolId"]',
  HILAN_TIME_CONTENT: ".cDM",
  HILAN_CLICKED_CLASS: "CSD",
  MALAM_ROWS: '#pt1\\:dataTable tr[role="row"]',
  MALAM_DATE_INPUT: 'input[id*="clockInDate"][id*="content"]',
  MALAM_CLOCK_IN: 'input[id*="clockInTime"][id*="content"]',
  MALAM_CLOCK_OUT: 'input[id*="clockOutTime"][id*="content"]',
  MALAM_WORK_TYPE: 'select[id*="workTypeSelect"]',
} as const;

export const ERROR_CODES = {
  EXT_DISABLED: "EXT_DISABLED",
  WRONG_SITE: "WRONG_SITE",
  NO_DATA: "NO_DATA",
  OPERATION_IN_PROGRESS: "OPERATION_IN_PROGRESS",
  NO_TIME_BOXES: "NO_TIME_BOXES",
  COPY_FAILED: "COPY_FAILED",
  PASTE_FAILED: "PASTE_FAILED",
  INVALID_RATE: "INVALID_RATE",
  INVALID_ACTION: "INVALID_ACTION",
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
  NO_HILAN_TAB: "NO_HILAN_TAB",
  HILAN_MONTH_UNREADABLE: "HILAN_MONTH_UNREADABLE",
  MALAM_MONTH_UNREADABLE: "MALAM_MONTH_UNREADABLE",
  MONTH_MISMATCH: "MONTH_MISMATCH",
} as const;

export const SHORTCUT_COMMANDS = {
  "copy-hours": { site: "HILAN", action: "copyHours" },
  "paste-hours": { site: "MALAM", action: "copyHours" },
  "auto-click": { site: "HILAN", action: "autoClickTimeBoxes" },
} as const satisfies Record<string, { site: SiteName; action: ExtensionAction }>;

export type ShortcutCommand = keyof typeof SHORTCUT_COMMANDS;

export const isShortcutCommand = (command: string): command is ShortcutCommand => command in SHORTCUT_COMMANDS;

export const SYNC_COMMAND = "sync-all";

const matchesHost = (hostname: string, domain: string): boolean =>
  hostname === domain || hostname.endsWith(`.${domain}`);

export const detectSite = (url: string): DetectedSite | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  for (const [name, site] of Object.entries(SITES) as [SiteName, (typeof SITES)[SiteName]][]) {
    if (
      site.domains.some(domain => matchesHost(hostname, domain)) &&
      site.paths.some(p => pathname.startsWith(p.toLowerCase()))
    ) {
      return { name, domains: site.domains, paths: site.paths, action: site.action };
    }
  }
  return null;
};

export const resolveShortcut = (command: string, url: string): ExtensionAction | null =>
  isShortcutCommand(command) && detectSite(url)?.name === SHORTCUT_COMMANDS[command].site
    ? SHORTCUT_COMMANDS[command].action
    : null;

interface TabRef {
  id?: number;
  url?: string;
  active?: boolean;
  windowId?: number;
}

export const pickTabForSite = (
  tabs: readonly TabRef[],
  site: SiteName,
  preferredWindowId?: number | null
): number | null => {
  const matches = tabs.filter(t => t.id !== undefined && detectSite(t.url ?? "")?.name === site);
  const hasPreferredWindow = preferredWindowId !== undefined && preferredWindowId !== null;
  const preferred = hasPreferredWindow ? matches.filter(t => t.windowId === preferredWindowId) : [];
  return (preferred.find(t => t.active) ?? preferred[0] ?? matches.find(t => t.active) ?? matches[0])?.id ?? null;
};

export const isValidTime = (s: string | null | undefined): s is string => /^\d{1,2}:\d{2}$/.test(s?.trim() ?? "");

export const sanitizeTime = (s: string | null | undefined): string | null =>
  s ? s.trim().replace(/[^\d:]/g, "") : null;

export interface Period {
  month: number | null;
  year: number | null;
}

export interface HilanDate {
  day: number;
  month: number;
  year: number | null;
  text: string;
}

export const parseHilanDate = (text: string): HilanDate | null => {
  const match = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: match[3] ? Number(match[3]) : null, text: match[0] };
};

export const monthYearFromDate = (text: string): Period => {
  const parsed = parseHilanDate(text);
  return parsed ? { month: parsed.month, year: parsed.year } : { month: null, year: null };
};

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export const hebrewMonthToPeriod = (label: string): Period => {
  const year = label.match(/\b(20\d{2})\b/)?.[1];
  const index = HEBREW_MONTHS.findIndex(name => label.includes(name));
  return { month: index === -1 ? null : index + 1, year: year ? Number(year) : null };
};

export const dominantPeriod = (dates: readonly string[]): Period => {
  const counts = new Map<number, number>();
  const years = new Map<number, number>();
  for (const date of dates) {
    const { month, year } = monthYearFromDate(date);
    if (month === null) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
    if (year !== null && !years.has(month)) years.set(month, year);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [month, count] of counts) {
    if (count > bestCount) {
      best = month;
      bestCount = count;
    }
  }
  return best === null ? { month: null, year: null } : { month: best, year: years.get(best) ?? null };
};

export const periodsMatch = (a: Period, b: Period): boolean => {
  if (a.month === null || b.month === null) return true;
  if (a.month !== b.month) return false;
  if (a.year !== null && b.year !== null && a.year !== b.year) return false;
  return true;
};

export const triggerEvents = (el: HTMLElement): void => {
  ["input", "change", "blur"].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true, cancelable: true })));
};

export const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
