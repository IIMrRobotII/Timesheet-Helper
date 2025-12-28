import type {
  StorageSchema,
  SiteConfig,
  DetectedSite,
  Selectors,
  ErrorCode,
  ExtensionResponse,
  ExtensionMessage,
} from '@/types';

interface StorageValidator {
  validate<T extends keyof StorageSchema>(
    key: T,
    value: StorageSchema[T]
  ): boolean;
  validateAll(data: Partial<StorageSchema>): boolean;
}

interface ConsolidatedStorageAPI {
  get(keys?: (keyof StorageSchema)[]): Promise<StorageSchema>;
  set(values: Partial<StorageSchema>): Promise<void>;
  setBatch(operations: Partial<StorageSchema>[]): Promise<void>;
  clear(): Promise<void>;
  getDefaults(): Partial<StorageSchema>;
}

const storageValidator: StorageValidator = {
  validate<T extends keyof StorageSchema>(
    key: T,
    value: StorageSchema[T]
  ): boolean {
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
        const analytics = value as StorageSchema['analytics'];

        const validateOperation = (
          op: StorageSchema['analytics']['operations']['copy']
        ) =>
          typeof op.success === 'number' &&
          typeof op.failures === 'number' &&
          (op.lastTime === null || typeof op.lastTime === 'string');

        return (
          typeof analytics.operations === 'object' &&
          analytics.operations !== null &&
          validateOperation(analytics.operations.copy) &&
          validateOperation(analytics.operations.paste) &&
          validateOperation(analytics.operations.autoClick) &&
          typeof analytics.totalOperations === 'number' &&
          typeof analytics.successRate === 'number'
        );
      }
      default:
        return false;
    }
  },

  validateAll(data: Partial<StorageSchema>): boolean {
    return Object.entries(data).every(([key, value]) =>
      this.validate(
        key as keyof StorageSchema,
        value as StorageSchema[keyof StorageSchema]
      )
    );
  },
};

const storage: ConsolidatedStorageAPI = {
  getDefaults: (): Partial<StorageSchema> => ({ ...DEFAULT_SETTINGS }),

  get: async (keys?: (keyof StorageSchema)[]): Promise<StorageSchema> => {
    return new Promise((resolve, reject) => {
      const keysToGet =
        keys || (Object.keys(DEFAULT_SETTINGS) as (keyof StorageSchema)[]);
      chrome.storage.local.get(keysToGet as string[], result => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(`Storage get failed: ${chrome.runtime.lastError.message}`)
          );
          return;
        }

        const stored = result as Partial<StorageSchema>;
        const merged = {
          ...DEFAULT_SETTINGS,
          ...stored,
        } as StorageSchema;

        if (!storageValidator.validateAll(merged)) {
          console.warn('Invalid data detected in storage, using defaults');
        }

        resolve(merged);
      });
    });
  },

  set: (values: Partial<StorageSchema>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!storageValidator.validateAll(values)) {
        reject(new Error('Invalid data provided to storage.set'));
        return;
      }

      chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(`Storage set failed: ${chrome.runtime.lastError.message}`)
          );
          return;
        }
        resolve();
      });
    });
  },

  setBatch: async (operations: Partial<StorageSchema>[]): Promise<void> => {
    const merged = operations.reduce((acc, op) => ({ ...acc, ...op }), {});
    return storage.set(merged);
  },

  clear: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              `Storage clear failed: ${chrome.runtime.lastError.message}`
            )
          );
          return;
        }
        resolve();
      });
    });
  },
};

const SITES: Record<string, SiteConfig> = {
  HILAN: {
    domain: 'hilan.co.il',
    paths: ['/Hilannetv2/Attendance/', '/Hilannetv2/attendance/'],
    action: 'copy',
  },
  MALAM: {
    domain: 'payroll.malam.com',
    paths: ['/Salprd5Root/faces/'],
    action: 'paste',
  },
};

const SELECTORS: Selectors = {
  HILAN_TIME_BOXES:
    'td[class*="cDIES"], td[class*="cHD"], td[class*="cMAD"], td[class*="calendarAbcenseDay"]',
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
};

const ERROR_CODES: Record<string, ErrorCode> = {
  EXT_DISABLED: 'EXT_DISABLED',
  WRONG_SITE: 'WRONG_SITE',
  NO_DATA: 'NO_DATA',
  OPERATION_IN_PROGRESS: 'OPERATION_IN_PROGRESS',
  NO_TIME_BOXES: 'NO_TIME_BOXES',
  COPY_FAILED: 'COPY_FAILED',
  PASTE_FAILED: 'PASTE_FAILED',
};

const DEFAULT_SETTINGS: Partial<StorageSchema> = {
  extensionEnabled: true,
  statisticsEnabled: true,
  analytics: {
    operations: {
      copy: {
        success: 0,
        failures: 0,
        lastTime: null,
      },
      paste: {
        success: 0,
        failures: 0,
        lastTime: null,
      },
      autoClick: {
        success: 0,
        failures: 0,
        lastTime: null,
      },
    },
    totalOperations: 0,
    successRate: 0,
  },
};

const TIMINGS = {
  HILAN_DOUBLE_CLICK_INTERVAL_MS: 100,
  TABS_MESSAGE_TIMEOUT_MS: 30000,
} as const;

const utils = {
  isValidTime: (str: string | null | undefined): str is string =>
    /^\d{1,2}:\d{2}$/.test(str?.trim() ?? ''),

  sanitizeTime: (str: string | null | undefined): string | null =>
    str ? str.trim().replace(/[^\d:]/g, '') : null,

  delay: (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms)),

  triggerEvents: (el: HTMLElement): void => {
    if (!el) {
      return;
    }
    ['input', 'change', 'blur'].forEach(type =>
      el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
    );
  },

  detectSite: (url: string): DetectedSite | null => {
    const lowerUrl = url.toLowerCase();
    for (const [name, site] of Object.entries(SITES)) {
      if (
        lowerUrl.includes(site.domain) &&
        site.paths.some(path => lowerUrl.includes(path.toLowerCase()))
      ) {
        return { name, ...site };
      }
    }
    return null;
  },

  tabs: {
    query: (options: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> =>
      new Promise(resolve => chrome.tabs.query(options, resolve)),

    sendMessage: <T = ExtensionResponse>(
      tabId: number,
      message: ExtensionMessage
    ): Promise<T> =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('COMMUNICATION_TIMEOUT')),
          TIMINGS.TABS_MESSAGE_TIMEOUT_MS
        );
        chrome.tabs.sendMessage(tabId, message, response => {
          clearTimeout(timeout);
          chrome.runtime.lastError
            ? reject(
                new Error(
                  `Communication failed: ${chrome.runtime.lastError.message}`
                )
              )
            : resolve(response as T);
        });
      }),
  },
};

export {
  storage,
  SITES,
  SELECTORS,
  ERROR_CODES,
  DEFAULT_SETTINGS,
  TIMINGS,
  utils,
};
