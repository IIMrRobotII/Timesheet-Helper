import type { StorageSchema, ExtensionMessage, ExtensionResponse, StatusType } from './types';

// Default settings
export const DEFAULTS: StorageSchema = {
  extensionEnabled: true,
  calculatorEnabled: true,
  statisticsEnabled: true,
  currentLanguage: 'system',
  currentTheme: 'system',
  timesheetData: {},
  hourlyRate: 0,
  analytics: {
    operations: {
      copy: { success: 0, failures: 0, lastTime: null },
      paste: { success: 0, failures: 0, lastTime: null },
      autoClick: { success: 0, failures: 0, lastTime: null },
    },
    totalOperations: 0,
    successRate: 0,
  },
};

// Site configurations
export const SITES = {
  HILAN: {
    domain: 'hilan.co.il',
    paths: ['/Hilannetv2/Attendance/', '/Hilannetv2/attendance/'],
    action: 'copy' as const,
  },
  MALAM: {
    domain: 'payroll.malam.com',
    paths: ['/Salprd5Root/faces/'],
    action: 'paste' as const,
  },
};

// DOM selectors
export const SELECTORS = {
  HILAN_TIME_BOXES:
    'td[class*="cDIES"], td[class*="cHD"], td[class*="cMAD"], td[class*="calendarAbcenseDay"], td[class*="calendarAbsenceDay"]',
  HILAN_DATE_CELL: 'td[id*="cellOf_ReportDate"]',
  HILAN_ENTRY_TIME: 'td[id*="cellOf_ManualEntry_EmployeeReports"]',
  HILAN_EXIT_TIME: 'td[id*="cellOf_ManualExit_EmployeeReports"]',
  HILAN_SYMBOL: 'select[id*="Symbol"]',
  HILAN_TIME_CONTENT: '.cDM',
  HILAN_CLICKED_CLASS: 'CSD',
  MALAM_ROWS: '#pt1\\:dataTable tr[role="row"]',
  MALAM_DATE_INPUT: 'input[id*="clockInDate"][id*="content"]',
  MALAM_CLOCK_IN: 'input[id*="clockInTime"][id*="content"]',
  MALAM_CLOCK_OUT: 'input[id*="clockOutTime"][id*="content"]',
  MALAM_WORK_TYPE: 'select[id*="workTypeSelect"]',
} as const;

// Error codes
export const ERROR_CODES = {
  EXT_DISABLED: 'EXT_DISABLED',
  WRONG_SITE: 'WRONG_SITE',
  NO_DATA: 'NO_DATA',
  OPERATION_IN_PROGRESS: 'OPERATION_IN_PROGRESS',
  NO_TIME_BOXES: 'NO_TIME_BOXES',
  COPY_FAILED: 'COPY_FAILED',
  PASTE_FAILED: 'PASTE_FAILED',
} as const;

// Calculation constants
export const CALC_CONSTANTS = {
  TRAVEL_REFUND_PER_DAY: 26,
  MEAL_REFUND_PER_DAY: 15,
  MEAL_ELIGIBLE_HOURS: 6,
  NIGHT_MULTIPLIER: 1.5,
  VACATION_HOURS_PER_DAY: 8,
  OT_125_START: 9,
  OT_125_END: 11,
  OT_150_START: 11,
} as const;

export const DAY_MAP: Record<string, number> = {
  'יום א': 0,
  'יום ב': 1,
  'יום ג': 2,
  'יום ד': 3,
  'יום ה': 4,
  'יום ו': 5,
  שבת: 6,
};

export const timeToDecimal = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
};

export const calculateNightHours = (entry: string, exit: string, dayOfWeek: number): number => {
  if (!entry || !exit) return 0;
  const entryDec = timeToDecimal(entry);
  let exitDec = timeToDecimal(exit);
  if (exitDec < entryDec) exitDec += 24;
  const totalHours = exitDec - entryDec;
  let nightHours = 0;

  if (dayOfWeek === 5) {
    if (entryDec >= 16 || exitDec > 16) {
      nightHours = Math.max(0, Math.min(exitDec, 24) - Math.max(entryDec, 16));
      if (exitDec > 24) nightHours += Math.min(exitDec - 24, 6);
    }
  } else if (dayOfWeek === 6) {
    nightHours = totalHours;
  } else {
    if (exitDec > 22) nightHours += Math.min(exitDec, 24) - Math.max(entryDec, 22);
    if (exitDec > 24) nightHours += Math.min(exitDec - 24, 6);
    if (entryDec < 6) nightHours += Math.min(6, exitDec) - entryDec;
  }
  return Math.min(Math.max(0, nightHours), totalHours);
};

export const calculateOvertime = (totalHours: number): { ot125: number; ot150: number } => ({
  ot125: Math.max(0, Math.min(totalHours, CALC_CONSTANTS.OT_125_END) - CALC_CONSTANTS.OT_125_START),
  ot150: Math.max(0, totalHours - CALC_CONSTANTS.OT_150_START),
});

// Storage validation (security)
const validateStorageValue = (key: string, value: unknown): boolean => {
  switch (key) {
    case 'extensionEnabled':
    case 'statisticsEnabled':
    case 'calculatorEnabled':
      return typeof value === 'boolean';
    case 'currentLanguage':
      return typeof value === 'string' && ['system', 'en', 'he'].includes(value);
    case 'currentTheme':
      return typeof value === 'string' && ['system', 'light', 'dark'].includes(value);
    case 'hourlyRate':
      return typeof value === 'number' && value >= 0;
    case 'timesheetData':
      return typeof value === 'object' && value !== null;
    case 'analytics': {
      if (typeof value !== 'object' || value === null) return false;
      const a = value as StorageSchema['analytics'];
      const validOp = (op: { success: number; failures: number; lastTime: string | null }) =>
        typeof op?.success === 'number' && typeof op?.failures === 'number';
      return (
        a.operations && validOp(a.operations.copy) && validOp(a.operations.paste) && validOp(a.operations.autoClick)
      );
    }
    default:
      return true;
  }
};

const validateStorage = (data: Partial<StorageSchema>): boolean =>
  Object.entries(data).every(([k, v]) => validateStorageValue(k, v));

// Storage API
export const storage = {
  async get(keys?: (keyof StorageSchema)[]): Promise<StorageSchema> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys || Object.keys(DEFAULTS), result => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        const merged = { ...DEFAULTS, ...result } as StorageSchema;
        if (!validateStorage(merged)) {
          console.warn('Invalid data in storage, using defaults');
        }
        resolve(merged);
      });
    });
  },

  async set(values: Partial<StorageSchema>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!validateStorage(values)) {
        return reject(new Error('Invalid data provided to storage.set'));
      }
      chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve();
      });
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve();
      });
    });
  },
};

// Utility functions
export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const isValidTime = (s: string | null | undefined): s is string => /^\d{1,2}:\d{2}$/.test(s?.trim() ?? '');

export const sanitizeTime = (s: string | null | undefined): string | null =>
  s ? s.trim().replace(/[^\d:]/g, '') : null;

export const triggerEvents = (el: HTMLElement) => {
  ['input', 'change', 'blur'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true, cancelable: true })));
};

export const detectSite = (url: string) => {
  const lower = url.toLowerCase();
  for (const [name, site] of Object.entries(SITES)) {
    if (lower.includes(site.domain) && site.paths.some(p => lower.includes(p.toLowerCase()))) {
      return { name, ...site };
    }
  }
  return null;
};

// Chrome tabs helpers
export const tabs = {
  query: (options: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> =>
    new Promise(resolve => chrome.tabs.query(options, resolve)),

  sendMessage: <T = ExtensionResponse>(tabId: number, message: ExtensionMessage): Promise<T> =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('COMMUNICATION_TIMEOUT')), 30000);
      chrome.tabs.sendMessage(tabId, message, response => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) reject(new Error(`Communication failed: ${chrome.runtime.lastError.message}`));
        else resolve(response as T);
      });
    }),
};

// Status display helper
export const showStatus = (
  el: HTMLElement | null,
  message: string | [string, StatusType] | null,
  type: StatusType = 'message'
) => {
  if (!el) return;
  if (!message) {
    el.className = '';
    el.classList.remove('visible');
    return;
  }
  const [text, finalType] = Array.isArray(message) ? message : [message, type];
  el.textContent = text;
  el.className = `visible status-${finalType}`;
};
