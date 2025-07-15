window.TimesheetCommon = {
  storage: {
    async get(key) {
      return new Promise((resolve) =>
        chrome.storage.local.get(key, (r) => resolve(r[key]))
      );
    },

    async getBatch(keys) {
      return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
    },

    async set(key, value) {
      return new Promise((resolve) =>
        chrome.storage.local.set({ [key]: value }, resolve)
      );
    },

    async setBatch(obj) {
      return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
    },

    async clear() {
      return new Promise((resolve) => chrome.storage.local.clear(resolve));
    },
  },

  SITES: {
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
  },

  SELECTORS: {
    HILAN_TIME_BOXES: 'td[class*="cDIES"], td[class*="cHD"]',
    HILAN_DATE_CELL: 'td[id*="cellOf_ReportDate"]',
    HILAN_ENTRY_TIME: 'td[id*="cellOf_ManualEntry_EmployeeReports"]',
    HILAN_EXIT_TIME: 'td[id*="cellOf_ManualExit_EmployeeReports"]',
    HILAN_TIME_CONTENT: ".cDM",
    HILAN_CLICKED_CLASS: "CSD",
    MALAM_ROWS: '#pt1\\:dataTable tr[role="row"]',
    MALAM_DATE_INPUT: 'input[id*="clockInDate"][id*="content"]',
    MALAM_CLOCK_IN: 'input[id*="clockInTime"][id*="content"]',
    MALAM_CLOCK_OUT: 'input[id*="clockOutTime"][id*="content"]',
  },

  STORAGE_KEYS: {
    ENABLED: "extensionEnabled",
    DATA: "timesheetData",
    LAST_COPY: "lastCopyTime",
    LAST_PASTE: "lastPasteTime",
    LAST_AUTO_CLICK: "lastAutoClickTime",
    TOTAL_COPIES: "totalCopies",
    TOTAL_PASTES: "totalPastes",
    TOTAL_AUTO_CLICKS: "totalAutoClicks",
    TOTAL_FAILURES: "totalFailures",
    COPY_FAILURES: "copyFailures",
    PASTE_FAILURES: "pasteFailures",
    AUTO_CLICK_FAILURES: "autoClickFailures",
    SUCCESS_RATE: "successRate",
    STATISTICS_ENABLED: "statisticsEnabled",
    CURRENT_LANGUAGE: "currentLanguage",
  },

  ERROR_CODES: {
    EXT_DISABLED: "EXT_DISABLED",
    WRONG_SITE: "WRONG_SITE",
    NO_DATA: "NO_DATA",
    OPERATION_IN_PROGRESS: "OPERATION_IN_PROGRESS",
    NO_TIME_BOXES: "NO_TIME_BOXES",
    COPY_FAILED: "COPY_FAILED",
    PASTE_FAILED: "PASTE_FAILED",
  },

  // Default settings
  DEFAULT_SETTINGS: {
    extensionEnabled: true,
    statisticsEnabled: true,
    lastCopyTime: null,
    lastPasteTime: null,
    lastAutoClickTime: null,
    totalCopies: 0,
    totalPastes: 0,
    totalAutoClicks: 0,
    copyFailures: 0,
    pasteFailures: 0,
    autoClickFailures: 0,
    totalFailures: 0,
    successRate: 0,
  },

  // UI Contexts
  CONTEXTS: {
    HILAN: { name: "contextHilan", type: "source", primaryAction: "copy" },
    MALAM: { name: "contextMalam", type: "target", primaryAction: "paste" },
    UNKNOWN: { name: "unknownWebsite", type: "unknown", primaryAction: null },
  },

  // Utility Functions
  utils: {
    // Time validation and formatting
    isValidTime: (str) => /^\d{1,2}:\d{2}$/.test(str?.trim()),
    sanitizeTime: (str) => (str ? str.trim().replace(/[^\d:]/g, "") : null),

    // Async utilities
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    // DOM utilities
    triggerEvents: (el) =>
      el &&
      ["input", "change", "blur"].forEach((type) =>
        el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
      ),

    // DOM selector helpers
    $: (s) => document.querySelector(s),
    $$: (s) => document.querySelectorAll(s),
    byId: (id) => document.getElementById(id),

    // Response formatting
    formatResponse: (success, data = {}) => ({
      success,
      timestamp: new Date().toISOString(),
      ...(success ? data : { error: data }),
    }),

    // Site detection
    detectSite: (url = location.href) => {
      const lowerUrl = url.toLowerCase();
      for (const [name, site] of Object.entries(TimesheetCommon.SITES)) {
        if (
          lowerUrl.includes(site.domain) &&
          site.paths.some((path) => lowerUrl.includes(path.toLowerCase()))
        ) {
          return { name, ...site };
        }
      }
      return null;
    },

    // Tabs utilities
    tabs: {
      query: (options) => chrome.tabs.query(options),
      sendMessage: (tabId, message) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("COMMUNICATION_TIMEOUT")),
            30000
          );
          chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeout);
            chrome.runtime.lastError
              ? reject(
                  new Error(
                    `Communication failed: ${chrome.runtime.lastError.message}`
                  )
                )
              : resolve(response);
          });
        }),
    },
  },
};
