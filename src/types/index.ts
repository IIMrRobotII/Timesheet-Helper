// Core domain types
export interface TimesheetEntry {
  entryTime: string;
  exitTime: string;
  originalHilanDate: string;
}

export interface TimesheetData {
  [date: string]: TimesheetEntry;
}

// Site configuration
export interface SiteConfig {
  domain: string;
  paths: string[];
  action: 'copy' | 'paste';
}

export interface DetectedSite {
  name: string;
  domain: string;
  paths: string[];
  action: 'copy' | 'paste';
}

// Chrome extension message types
export interface ExtensionMessage {
  action: 'autoClickTimeBoxes' | 'copyHours';
}

export interface ExtensionResponse {
  success: boolean;
  timestamp: string;
  error?: {
    code: string;
    message?: string;
  };
  count?: number;
  clickedCount?: number;
  totalBoxes?: number;
  skippedCount?: number;
}

// Storage schema
export interface StorageSchema {
  extensionEnabled: boolean;
  timesheetData: TimesheetData;
  analytics: {
    operations: {
      copy: AnalyticsOperation;
      paste: AnalyticsOperation;
      autoClick: AnalyticsOperation;
    };
    totalOperations: number;
    successRate: number;
  };
  statisticsEnabled: boolean;
  currentLanguage: string;
}

// UI Context types
export interface UIContext {
  name: string;
  type: 'source' | 'target' | 'unknown';
  primaryAction: 'copy' | 'paste';
}

// Analytics event types
export type AnalyticsEventType = 'copy' | 'paste' | 'autoClick';

// Analytics operation interface
export interface AnalyticsOperation {
  success: number;
  failures: number;
  lastTime: string | null;
}

// Operation results
export interface AutoClickResult {
  clickedCount: number;
  totalBoxes: number;
  skippedCount: number;
}

export interface OperationResult {
  count: number;
}

// DOM selector constants (typed)
export interface Selectors {
  // Hilan selectors
  HILAN_TIME_BOXES: string;
  HILAN_DATE_CELL: string;
  HILAN_ENTRY_TIME: string;
  HILAN_EXIT_TIME: string;
  HILAN_TIME_CONTENT: string;
  HILAN_CLICKED_CLASS: string;

  // Malam selectors
  MALAM_ROWS: string;
  MALAM_DATE_INPUT: string;
  MALAM_CLOCK_IN: string;
  MALAM_CLOCK_OUT: string;
}

// Error codes (strongly typed)
export type ErrorCode =
  | 'EXT_DISABLED'
  | 'WRONG_SITE'
  | 'NO_DATA'
  | 'OPERATION_IN_PROGRESS'
  | 'NO_TIME_BOXES'
  | 'COPY_FAILED'
  | 'PASTE_FAILED'
  | 'COMMUNICATION_TIMEOUT'
  | 'UNEXPECTED_ERROR'
  | 'INVALID_ACTION';

// Language and i18n types
export type SupportedLanguage = 'en' | 'he';

export interface I18nMessages {
  [key: string]: string;
}

// Complete I18nManager interface matching the actual implementation
export interface I18nManager {
  init(): Promise<void>;
  getMessage(
    key: string,
    substitutions?: string[] | [string] | [string, string]
  ): string;
  getCurrentLanguage(): SupportedLanguage;
  switchLanguage(language: SupportedLanguage): Promise<boolean>;

  // Context and message methods
  getWorkingMessages(): {
    autoClick: string;
    copying: string;
    pasting: string;
    clearing: string;
  };
  getErrorMessages(): {
    extensionDisabled: string;
    wrongSite: string;
    noData: string;
    inProgress: string;
    noTimeBoxes: string;
    copyFailed: string;
    pasteFailed: string;
    invalidAction: string;
  };

  // Formatting methods
  formatCounterValue(
    timestamp: string | null,
    count: number,
    failures?: number
  ): string;
  formatTimestamp(timestamp: string | null): string;

  // Utility methods
  isRtl(): boolean;
  getTextDirection(): 'ltr' | 'rtl';
  setDocumentDirection(): void;
}

// Global window interface extension
declare global {
  interface Window {
    i18nManager: I18nManager;
  }
}

// Consolidated PopupController interface covering all UI component needs
export interface PopupController {
  isOperationInProgress: boolean;
  currentContext: UIContext;
  modalResolve: ((value: boolean) => void) | null;
  i18n: I18nManager;

  // Storage interface
  storage: {
    get<T>(defaults: T): Promise<StorageSchema>;
    set(values: Partial<StorageSchema>): Promise<void>;
    clear(): Promise<void>;
  };
  DEFAULTS: Partial<StorageSchema>;

  uiManager: UIManager;

  analyticsDisplay: {
    loadAnalytics(): Promise<void>;
  };

  // Core methods
  detectCurrentContext(): Promise<UIContext>;
  handleClearData(): Promise<void>;

  // Event handler methods for delegation
  handleExtensionToggle?: (e: Event) => void;
  handleStatisticsToggle?: (e: Event) => void;
  handleAutoClickOperation?: (e: Event) => void;
  handlePrimaryOperation?: (e: Event) => void;
  handleModalCancel?: (e: Event) => void;
  handleModalConfirm?: (e: Event) => void;
  handleModalBackdrop?: (e: Event) => void;
  handleEscapeKey?: (e: KeyboardEvent) => void;
}

// Consolidated UIManager interface covering all component needs
export interface UIManager {
  elements: {
    extensionToggle?: HTMLInputElement;
    statisticsToggle?: HTMLInputElement;

    // Button elements
    autoClickButton?: HTMLButtonElement;
    copyHours?: HTMLButtonElement;

    // Language elements
    languageDropdown?: HTMLElement;
    languageToggle?: HTMLElement;

    // Layout elements
    container?: HTMLElement;
    contextBadge?: HTMLElement;
    toggleLabel?: HTMLElement;
    guidanceText?: HTMLElement;
    statusDiv?: HTMLElement;
    analyticsSection?: HTMLElement;
    confirmModal?: HTMLElement;

    // Index signature for dynamic element access
    [key: string]: HTMLElement | undefined;
  };

  // Core UI methods
  updateUIState(enabled: boolean, immediate?: boolean): void;
  updateButtonAvailability(context: UIContext, inProgress: boolean): void;
  updateStatisticsVisibility(visible: boolean): void;
  updateAllText(): void;
  updateInterface(context: UIContext): void;

  // Modal methods
  showModal(): Promise<boolean>;

  // Status and button methods
  showStatus(
    message:
      | string
      | [
          string,
          'message' | 'success' | 'error' | 'warning' | 'working' | 'info',
        ]
      | null,
    type?: 'message' | 'success' | 'error' | 'warning' | 'working' | 'info'
  ): void;

  updateLanguageDropdown(): void;
  handleLanguageToggle(e: Event): void;
  handleDocumentClick(): void;
  handleLanguageOption(e: Event): void;
  switchLanguage(language: SupportedLanguage): Promise<void>;
  reloadExtensionUI(): Promise<void>;

  handleModal(confirmed: boolean): void;
}
