// Core data types
export interface TimesheetEntry {
  entryTime: string;
  exitTime: string;
  originalHilanDate: string;
  isVacation?: boolean;
}

export interface TimesheetData {
  [date: string]: TimesheetEntry;
}

// Chrome extension messaging
export interface ExtensionMessage {
  action: 'autoClickTimeBoxes' | 'copyHours';
}

export interface ExtensionResponse {
  success: boolean;
  timestamp: string;
  error?: { code: string; message?: string };
  count?: number;
  clickedCount?: number;
  totalBoxes?: number;
  skippedCount?: number;
}

// Storage schema
export interface StorageSchema {
  extensionEnabled: boolean;
  statisticsEnabled: boolean;
  currentLanguage: string;
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
}

export interface AnalyticsOperation {
  success: number;
  failures: number;
  lastTime: string | null;
}

// Language types
export type SupportedLanguage = 'en' | 'he';
export type AnalyticsEventType = 'copy' | 'paste' | 'autoClick';
export type StatusType =
  | 'message'
  | 'success'
  | 'error'
  | 'warning'
  | 'working'
  | 'info';

// UI context for popup
export interface UIContext {
  name: string;
  type: 'source' | 'target' | 'unknown';
  primaryAction: 'copy' | 'paste';
}
