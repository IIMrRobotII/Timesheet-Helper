export interface Messages {
  pageTitle: string;
  settings: string;
  unknownWebsite: string;
  contextHilanTimesheet: string;
  contextHilan: string;
  contextMalam: string;
  extensionEnabled: string;
  extensionDisabled: string;
  guidanceDefault: string;
  guidanceSource: string;
  guidanceTarget: string;
  autoClick: string;
  copyHours: string;
  pasteHours: string;
  syncHours: string;
  syncEverything: string;
  workingSyncing: string;
  successSynced: (copied: number, pasted: number) => string;
  syncNoMalam: (copied: number) => string;
  errorNoHilanTab: string;
  errorHilanMonthUnreadable: string;
  errorMalamMonthUnreadable: string;
  errorMonthMismatch: string;
  salaryCalculator: string;
  hourlyRate: string;
  calculate: string;
  results: string;
  resultTotalPay: string;
  resultRegular: string;
  resultNight: string;
  resultWorkDays: string;
  resultVacation: string;
  resultTravel: string;
  resultMeal: string;
  resultOvertime125: string;
  resultOvertime150: string;
  workingCopying: string;
  workingPasting: string;
  workingAutoClick: string;
  workingCalculating: string;
  workingClearing: string;
  successCopied: (count: number) => string;
  successPasted: (count: number) => string;
  successAutoClick: (clicked: number, total: number) => string;
  successCalculated: string;
  successCleared: string;
  errorExtensionDisabled: string;
  errorWrongSite: string;
  errorNoData: string;
  errorInProgress: string;
  errorNoTimeBoxes: string;
  errorUnknownAction: string;
  errorOperationFailed: string;
  errorOperationTimedOut: string;
  errorCommunicationIssue: string;
  errorNoTimesheetData: string;
  errorEnterHourlyRate: string;
  errorClearDataFailed: string;
  appearance: string;
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  language: string;
  languageSystem: string;
  keyboardShortcuts: string;
  shortcutsHint: string;
  customizeShortcuts: string;
  dataManagement: string;
  clearAllData: string;
  modalTitle: string;
  modalMessage: string;
  modalCancel: string;
  modalConfirm: string;
  support: string;
  viewOnGitHub: string;
  privacyPolicy: string;
  footerMadeBy: string;
}

export const en = {
  pageTitle: "Timesheet Helper",
  settings: "Settings",
  unknownWebsite: "Unknown Website",
  contextHilanTimesheet: "Hilan Timesheet",
  contextHilan: "Hilan",
  contextMalam: "Malam Payroll",
  extensionEnabled: "Extension Enabled",
  extensionDisabled: "Extension Disabled",
  guidanceDefault: "Open your Hilan timesheet or the Malam payroll page to get started.",
  guidanceSource: "Reveal the time boxes, then copy your hours from Hilan.",
  guidanceTarget: "Paste your copied hours into the Malam payroll sheet.",
  autoClick: "Auto-Click Time Boxes",
  copyHours: "Copy Hours",
  pasteHours: "Paste Hours",
  syncHours: "Sync Hours",
  syncEverything: "Sync Everything",
  workingSyncing: "Syncing everything…",
  successSynced: (copied, pasted) => `Copied ${copied}, pasted ${pasted}.`,
  syncNoMalam: copied => `Copied ${copied}. Open Malam to paste.`,
  errorNoHilanTab: "Open your Hilan timesheet first.",
  errorHilanMonthUnreadable: "Open Hilan on the timesheet view so the month is visible.",
  errorMalamMonthUnreadable: "Open Malam on the attendance view so the dates are visible.",
  errorMonthMismatch: "Hilan and Malam are on different months. Line them up and try again.",
  salaryCalculator: "Salary Calculator",
  hourlyRate: "Rate",
  calculate: "Calculate",
  results: "Results",
  resultTotalPay: "Total Pay",
  resultRegular: "Regular (100%)",
  resultNight: "Night/Weekend (150%)",
  resultWorkDays: "Work Days",
  resultVacation: "Vacation",
  resultTravel: "Travel",
  resultMeal: "Meals",
  resultOvertime125: "Overtime (125%)",
  resultOvertime150: "Overtime (150%)",
  workingCopying: "Copying timesheet data…",
  workingPasting: "Pasting timesheet data…",
  workingAutoClick: "Auto-clicking time boxes…",
  workingCalculating: "Calculating…",
  workingClearing: "Clearing extension data…",
  successCopied: count => `Copied ${count} entries from Hilan.`,
  successPasted: count => `Pasted ${count} entries into Malam.`,
  successAutoClick: (clicked, total) => `Clicked ${clicked} of ${total} time boxes.`,
  successCalculated: "Calculated.",
  successCleared: "All extension data cleared.",
  errorExtensionDisabled: "The extension is off. Turn it on to continue.",
  errorWrongSite: "This action is not available on the current page.",
  errorNoData: "No timesheet data found. Make sure you are on the right page.",
  errorInProgress: "Another operation is running. Please wait.",
  errorNoTimeBoxes: "No time boxes found. Open the Hilan timesheet calendar.",
  errorUnknownAction: "Unknown action requested.",
  errorOperationFailed: "Operation failed.",
  errorOperationTimedOut: "Operation timed out. Please try again.",
  errorCommunicationIssue: "Communication issue. The operation may have succeeded.",
  errorNoTimesheetData: "No data yet. Auto-click the time boxes first.",
  errorEnterHourlyRate: "Enter an hourly rate.",
  errorClearDataFailed: "Could not clear data.",
  appearance: "Appearance",
  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  language: "Language",
  languageSystem: "System",
  keyboardShortcuts: "Keyboard Shortcuts",
  shortcutsHint: "Open the shortcuts page to change them.",
  customizeShortcuts: "Customize in Chrome",
  dataManagement: "Data",
  clearAllData: "Clear All Data",
  modalTitle: "Clear all extension data?",
  modalMessage: "This permanently deletes your copied timesheet data and settings.",
  modalCancel: "Cancel",
  modalConfirm: "Clear Data",
  support: "Support",
  viewOnGitHub: "View on GitHub",
  privacyPolicy: "Privacy Policy",
  footerMadeBy: "Made by Segev Levinshtein",
} satisfies Messages;

export const he = {
  pageTitle: "עוזר דוח נוכחות",
  settings: "הגדרות",
  unknownWebsite: "אתר לא מזוהה",
  contextHilanTimesheet: "דוח נוכחות חילן",
  contextHilan: "חילן",
  contextMalam: "מערכת שכר מלם",
  extensionEnabled: "תוסף מופעל",
  extensionDisabled: "תוסף כבוי",
  guidanceDefault: "פתח את דוח הנוכחות בחילן או את מערכת השכר במלם כדי להתחיל.",
  guidanceSource: "חשוף את תיבות הזמן ואז העתק את השעות מחילן.",
  guidanceTarget: "הדבק את השעות שהעתקת לדוח השכר במלם.",
  autoClick: "לחיצה אוטומטית על תיבות זמן",
  copyHours: "העתק שעות",
  pasteHours: "הדבק שעות",
  syncHours: "סנכרון שעות",
  syncEverything: "סנכרן הכול",
  workingSyncing: "מסנכרן הכול…",
  successSynced: (copied, pasted) => `הועתקו ${copied}, הודבקו ${pasted}.`,
  syncNoMalam: copied => `הועתקו ${copied}. פתח את מלם כדי להדביק.`,
  errorNoHilanTab: "פתח קודם את דוח הנוכחות בחילן.",
  errorHilanMonthUnreadable: "פתח את חילן בתצוגת דוח הנוכחות כדי שהחודש יהיה גלוי.",
  errorMalamMonthUnreadable: "פתח את מלם בתצוגת הנוכחות כדי שהתאריכים יהיו גלויים.",
  errorMonthMismatch: "חילן ומלם מציגים חודשים שונים. יישר ביניהם ונסה שוב.",
  salaryCalculator: "מחשבון שכר",
  hourlyRate: "תעריף",
  calculate: "חשב",
  results: "תוצאות",
  resultTotalPay: "סה״כ",
  resultRegular: "רגיל (100%)",
  resultNight: "לילה/סופ״ש (150%)",
  resultWorkDays: "ימי עבודה",
  resultVacation: "חופשה",
  resultTravel: "נסיעות",
  resultMeal: "ארוחות",
  resultOvertime125: "שעות נוספות (125%)",
  resultOvertime150: "שעות נוספות (150%)",
  workingCopying: "מעתיק נתוני דוח נוכחות…",
  workingPasting: "מדביק נתוני דוח נוכחות…",
  workingAutoClick: "לוחץ אוטומטית על תיבות זמן…",
  workingCalculating: "מחשב…",
  workingClearing: "מוחק נתוני תוסף…",
  successCopied: count => `הועתקו ${count} רשומות מחילן.`,
  successPasted: count => `הודבקו ${count} רשומות למלם.`,
  successAutoClick: (clicked, total) => `נלחצו ${clicked} מתוך ${total} תיבות זמן.`,
  successCalculated: "חושב.",
  successCleared: "כל נתוני התוסף נמחקו.",
  errorExtensionDisabled: "התוסף כבוי. הפעל אותו כדי להמשיך.",
  errorWrongSite: "הפעולה אינה זמינה בעמוד הנוכחי.",
  errorNoData: "לא נמצאו נתוני דוח נוכחות. ודא שאתה בעמוד הנכון.",
  errorInProgress: "פעולה אחרת מתבצעת. אנא המתן.",
  errorNoTimeBoxes: "לא נמצאו תיבות זמן. פתח את יומן הנוכחות בחילן.",
  errorUnknownAction: "התבקשה פעולה לא מוכרת.",
  errorOperationFailed: "הפעולה נכשלה.",
  errorOperationTimedOut: "הפעולה פגה. אנא נסה שוב.",
  errorCommunicationIssue: "בעיית תקשורת. ייתכן שהפעולה הצליחה.",
  errorNoTimesheetData: "אין עדיין נתונים. בצע קודם לחיצה אוטומטית על תיבות הזמן.",
  errorEnterHourlyRate: "הזן תעריף שעתי.",
  errorClearDataFailed: "מחיקת הנתונים נכשלה.",
  appearance: "מראה",
  theme: "ערכת נושא",
  themeSystem: "מערכת",
  themeLight: "בהיר",
  themeDark: "כהה",
  language: "שפה",
  languageSystem: "מערכת",
  keyboardShortcuts: "קיצורי מקלדת",
  shortcutsHint: "פתח את עמוד הקיצורים כדי לשנותם.",
  customizeShortcuts: "התאמה ב-Chrome",
  dataManagement: "נתונים",
  clearAllData: "נקה את כל הנתונים",
  modalTitle: "למחוק את כל נתוני התוסף?",
  modalMessage: "פעולה זו תמחק לצמיתות את נתוני דוח הנוכחות וההגדרות.",
  modalCancel: "ביטול",
  modalConfirm: "מחק נתונים",
  support: "תמיכה",
  viewOnGitHub: "צפה ב-GitHub",
  privacyPolicy: "מדיניות פרטיות",
  footerMadeBy: "נוצר על ידי שגב לוינשטיין",
} satisfies Messages;

export const CATALOGS: Record<"en" | "he", Messages> = { en, he };
