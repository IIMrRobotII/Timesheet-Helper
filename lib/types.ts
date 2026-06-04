import type { ERROR_CODES, Period } from "./sites";

export interface TimesheetEntry {
  entryTime: string;
  exitTime: string;
  originalHilanDate: string;
  isVacation?: boolean;
}

export type TimesheetData = Record<string, TimesheetEntry>;

export type ReportType = "regular" | "vacation" | "absence";

export interface ParsedTimesheetRow {
  date: string;
  dayOfWeek: number;
  entryTime: string;
  exitTime: string;
  totalHours: number;
  reportType: ReportType;
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

export type ExtensionAction = "autoClickTimeBoxes" | "copyHours" | "calculateSalary" | "autoClickAndCopy" | "readMonth";

export interface ExtensionMessage {
  action: ExtensionAction;
  hourlyRate?: number;
}

export type ExtensionErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ExtensionResponse =
  | {
      success: true;
      action: "autoClickTimeBoxes";
      clickedCount: number;
      totalBoxes: number;
      skippedCount: number;
      alreadyClicked: number;
    }
  | { success: true; action: "copyHours" | "autoClickAndCopy"; count: number }
  | ({ success: true; action: "readMonth" } & Period)
  | { success: true; action: "calculateSalary"; calculatorResult: CalculatorResult }
  | { success: false; error: { code: ExtensionErrorCode; message?: string } };

export interface FullSyncRequest {
  kind: "fullSync";
}

export type FullSyncResult =
  | { status: "synced"; copied: number; pasted: number }
  | { status: "copiedNoMalam"; copied: number }
  | { status: "error"; code: ExtensionErrorCode };

export type ThemePref = "system" | "light" | "dark";
export type LanguagePref = "system" | "en" | "he";

export interface StorageSchema {
  extensionEnabled: boolean;
  calculatorEnabled: boolean;
  currentLanguage: LanguagePref;
  currentTheme: ThemePref;
  timesheetData: TimesheetData;
  hourlyRate: number;
}

export type ContextId = "hilanTimesheet" | "hilan" | "malam" | "unknown";
export type ContextKind = "source" | "target" | "unknown";

export interface UIContext {
  id: ContextId;
  kind: ContextKind;
  primaryAction: "copy" | "paste";
}
