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

export type ExtensionAction = "autoClickTimeBoxes" | "copyHours" | "calculateSalary";

export interface ExtensionMessage {
  action: ExtensionAction;
  hourlyRate?: number;
}

export type ExtensionResponse =
  | {
      success: true;
      count?: number;
      clickedCount?: number;
      totalBoxes?: number;
      skippedCount?: number;
      calculatorResult?: CalculatorResult;
    }
  | { success: false; error: { code: string; message?: string } };

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
