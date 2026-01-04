// Core data types
export interface TimesheetEntry {
  entryTime: string;
  exitTime: string;
  originalHilanDate: string;
  isVacation?: boolean;
  dayOfWeek?: number; // 0=Sunday, 6=Saturday
  reportType?: string;
}

export interface ParsedTimesheetRow {
  date: string;
  dayOfWeek: number;
  entryTime: string;
  exitTime: string;
  totalHours: number;
  reportType: 'regular' | 'vacation' | 'absence';
  isHoliday: boolean;
}

export interface CalculatorResult {
  totalPay: number;
  regularHours: number;
  regularPay: number;
  nightHours: number;
  nightPay: number;
  vacationDays: number;
  vacationPay: number;
  workDays: number;
  workDaysPay: number;
  travelRefund: number;
  mealRefund: number;
  mealEligibleDays: number;
  overtime125Hours: number;
  overtime125Pay: number;
  overtime150Hours: number;
  overtime150Pay: number;
  periodStart: string;
  periodEnd: string;
}

export interface TimesheetData {
  [date: string]: TimesheetEntry;
}

// Chrome extension messaging
export interface ExtensionMessage {
  action: 'autoClickTimeBoxes' | 'copyHours' | 'calculateSalary';
  hourlyRate?: number;
}

export interface ExtensionResponse {
  success: boolean;
  timestamp: string;
  error?: { code: string; message?: string };
  count?: number;
  clickedCount?: number;
  totalBoxes?: number;
  skippedCount?: number;
  calculatorResult?: CalculatorResult;
}

// Storage schema
export interface StorageSchema {
  extensionEnabled: boolean;
  calculatorEnabled: boolean;
  statisticsEnabled: boolean;
  currentLanguage: string;
  currentTheme: 'system' | 'light' | 'dark';
  timesheetData: TimesheetData;
  hourlyRate: number;
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
export type StatusType = 'message' | 'success' | 'error' | 'warning' | 'working' | 'info';

// UI context for popup
export type ContextId = 'hilanTimesheet' | 'hilan' | 'malam' | 'unknown';

export interface UIContext {
  id: ContextId;
  name: string;
  type: 'source' | 'target' | 'unknown';
  primaryAction: 'copy' | 'paste';
}
