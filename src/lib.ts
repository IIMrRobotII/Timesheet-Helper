import type { StorageSchema, ExtensionMessage, ExtensionResponse, StatusType } from './types';

// Default settings
export const DEFAULTS: StorageSchema = {
  extensionEnabled: true,
  statisticsEnabled: true,
  currentLanguage: 'en',
  timesheetData: {},
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

// Storage validation (security)
const validateStorageValue = (key: string, value: unknown): boolean => {
  switch (key) {
    case 'extensionEnabled':
    case 'statisticsEnabled':
      return typeof value === 'boolean';
    case 'currentLanguage':
      return typeof value === 'string' && ['en', 'he'].includes(value);
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
