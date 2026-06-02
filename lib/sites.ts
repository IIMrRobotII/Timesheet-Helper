export const SITES = {
  HILAN: {
    domain: "hilan.co.il",
    paths: ["/Hilannetv2/Attendance/", "/Hilannetv2/attendance/"],
    action: "copy",
  },
  MALAM: {
    domain: "payroll.malam.com",
    paths: ["/Salprd5Root/faces/"],
    action: "paste",
  },
} as const;

export type SiteName = keyof typeof SITES;

export interface DetectedSite {
  name: SiteName;
  domain: string;
  paths: readonly string[];
  action: "copy" | "paste";
}

export const SELECTORS = {
  HILAN_TIME_BOXES:
    'td[class*="cDIES"], td[class*="cHD"], td[class*="cMAD"], td[class*="calendarAbcenseDay"], td[class*="calendarAbsenceDay"]',
  HILAN_DATE_CELL: 'td[id*="cellOf_ReportDate"]',
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
} as const;

export const detectSite = (url: string): DetectedSite | null => {
  const lower = url.toLowerCase();
  for (const [name, site] of Object.entries(SITES) as [SiteName, (typeof SITES)[SiteName]][]) {
    if (lower.includes(site.domain) && site.paths.some(p => lower.includes(p.toLowerCase()))) {
      return { name, domain: site.domain, paths: site.paths, action: site.action };
    }
  }
  return null;
};

export const isValidTime = (s: string | null | undefined): s is string => /^\d{1,2}:\d{2}$/.test(s?.trim() ?? "");

export const sanitizeTime = (s: string | null | undefined): string | null =>
  s ? s.trim().replace(/[^\d:]/g, "") : null;

export const triggerEvents = (el: HTMLElement): void => {
  ["input", "change", "blur"].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true, cancelable: true })));
};

export const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
