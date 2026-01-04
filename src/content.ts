import {
  storage,
  SELECTORS,
  ERROR_CODES,
  detectSite,
  delay,
  isValidTime,
  sanitizeTime,
  triggerEvents,
  DAY_MAP,
  timeToDecimal,
  calculateNightHours,
  calculateOvertime,
  CALC_CONSTANTS,
} from './lib';
import type { ExtensionMessage, ExtensionResponse, TimesheetData, ParsedTimesheetRow, CalculatorResult } from './types';
let isProcessing = false;
const currentSite = detectSite(location.href);
const TOTAL_CELL_SELECTOR = 'td[id*="cellOf_ManualTotal_EmployeeReports"]';
const REPORT_TYPE_SELECTOR = 'select[id*="Symbol.SymbolId"]';
chrome.runtime.onMessage.addListener(
  (request: ExtensionMessage, _sender, sendResponse: (r: ExtensionResponse) => void) => {
    handleMessage(request, sendResponse);
    return true;
  }
);
async function handleMessage(request: ExtensionMessage, sendResponse: (r: ExtensionResponse) => void) {
  const timestamp = new Date().toISOString();
  try {
    const data = await storage.get(['extensionEnabled']);
    if (data.extensionEnabled === false)
      return sendResponse({
        success: false,
        timestamp,
        error: { code: ERROR_CODES.EXT_DISABLED },
      });
    if (isProcessing)
      return sendResponse({
        success: false,
        timestamp,
        error: { code: ERROR_CODES.OPERATION_IN_PROGRESS },
      });
    isProcessing = true;
    const result = await executeAction(request.action, request.hourlyRate);
    sendResponse(result);
  } catch (e) {
    sendResponse({
      success: false,
      timestamp,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
    });
  } finally {
    isProcessing = false;
  }
}
async function executeAction(action: ExtensionMessage['action'], hourlyRate?: number): Promise<ExtensionResponse> {
  const timestamp = new Date().toISOString();
  if (!currentSite) return { success: false, timestamp, error: { code: ERROR_CODES.WRONG_SITE } };
  if (action === 'calculateSalary') {
    if (currentSite.action !== 'copy') return { success: false, timestamp, error: { code: ERROR_CODES.WRONG_SITE } };
    if (!hourlyRate || hourlyRate <= 0) return { success: false, timestamp, error: { code: 'INVALID_RATE' } };
    const rows = parseTimesheetFromDOM();
    if (rows.length === 0) return { success: false, timestamp, error: { code: ERROR_CODES.NO_DATA } };
    return { success: true, timestamp, calculatorResult: calculateSalary(rows, hourlyRate) };
  }
  const eventType = action === 'autoClickTimeBoxes' ? 'autoClick' : currentSite.action === 'copy' ? 'copy' : 'paste';
  try {
    let result: { count?: number; clickedCount?: number; totalBoxes?: number; skippedCount?: number };
    if (action === 'autoClickTimeBoxes') {
      if (currentSite.action !== 'copy') return { success: false, timestamp, error: { code: ERROR_CODES.WRONG_SITE } };
      result = await performAutoClick();
    } else if (action === 'copyHours') {
      if (currentSite.action === 'copy') result = await copyTimesheetData();
      else if (currentSite.action === 'paste') result = await pasteTimesheetData();
      else return { success: false, timestamp, error: { code: ERROR_CODES.WRONG_SITE } };
    } else {
      return { success: false, timestamp, error: { code: 'INVALID_ACTION' } };
    }
    await trackAnalytics(eventType, true);
    await delay(100);
    return { success: true, timestamp, ...result };
  } catch {
    const errorCode =
      action === 'autoClickTimeBoxes'
        ? ERROR_CODES.NO_TIME_BOXES
        : currentSite.action === 'copy'
          ? ERROR_CODES.COPY_FAILED
          : ERROR_CODES.PASTE_FAILED;
    await trackAnalytics(eventType, false);
    await delay(100);
    return { success: false, timestamp, error: { code: errorCode } };
  }
}
async function performAutoClick() {
  const boxes = Array.from(document.querySelectorAll(SELECTORS.HILAN_TIME_BOXES)).filter(
    (cell): cell is HTMLElement => {
      if (cell.classList.contains(SELECTORS.HILAN_CLICKED_CLASS)) return false;
      const title = cell.getAttribute('title');
      if (title?.includes('חופשה') || cell.textContent?.includes('חופשה')) return true;
      if (title && isValidTime(title.trim())) return true;
      const content = cell.querySelector(SELECTORS.HILAN_TIME_CONTENT);
      return Boolean(content && isValidTime(content.textContent?.trim() ?? ''));
    }
  );
  if (boxes.length === 0) throw new Error(ERROR_CODES.NO_TIME_BOXES);
  let clickedCount = 0;
  for (const box of boxes) {
    try {
      box.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
      clickedCount++;
      if (clickedCount < boxes.length) await delay(100);
    } catch {
      continue;
    }
  }
  return {
    clickedCount,
    totalBoxes: boxes.length,
    skippedCount: boxes.length - clickedCount,
  };
}
async function copyTimesheetData() {
  const timesheetData: TimesheetData = {};
  for (const row of Array.from(document.querySelectorAll('tr'))) {
    const dateCell = row.querySelector(SELECTORS.HILAN_DATE_CELL);
    const ov = dateCell?.getAttribute('ov');
    if (!ov) continue;
    const hilanDate = ov.split(' ')[0];
    if (!hilanDate?.includes('/')) continue;
    const isHolidayRow = dateCell?.getAttribute('rowspan') === '2';
    const dataRow = isHolidayRow ? (row.nextElementSibling as HTMLElement) : row;
    if (!dataRow) continue;
    const entryCell = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME);
    const exitCell = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME);
    if (!entryCell || !exitCell) continue;
    const entryTime = sanitizeTime(entryCell.getAttribute('ov'));
    const exitTime = sanitizeTime(exitCell.getAttribute('ov'));
    const symbolSelect = dataRow.querySelector(SELECTORS.HILAN_SYMBOL) as HTMLSelectElement | null;
    const isVacation =
      symbolSelect?.value === '481' || symbolSelect?.options[symbolSelect.selectedIndex]?.text.includes('חופשה');
    if (!isVacation && (!entryTime || !exitTime || !isValidTime(entryTime) || !isValidTime(exitTime))) continue;
    const dateParts = hilanDate.split('/');
    const dataMonth = parseInt(dateParts[1] || '0', 10);
    const now = new Date();
    const year = dataMonth > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    const malamDate = dateParts.length === 3 ? hilanDate : `${hilanDate}/${year}`;
    timesheetData[malamDate] = {
      entryTime: entryTime || '',
      exitTime: exitTime || '',
      originalHilanDate: hilanDate,
      isVacation,
    };
  }
  const count = Object.keys(timesheetData).length;
  if (count === 0) throw new Error(ERROR_CODES.NO_DATA);
  await storage.set({ timesheetData });
  return { count };
}
async function pasteTimesheetData() {
  const data = await storage.get(['timesheetData']);
  const timesheetData = data.timesheetData;
  if (!timesheetData || Object.keys(timesheetData).length === 0) throw new Error(ERROR_CODES.NO_DATA);
  let filledCount = 0;
  for (const row of Array.from(document.querySelectorAll(SELECTORS.MALAM_ROWS))) {
    const dateInput = row.querySelector(SELECTORS.MALAM_DATE_INPUT) as HTMLInputElement | null;
    if (!dateInput?.value) continue;
    const entry = timesheetData[dateInput.value.trim()];
    if (!entry) continue;
    const clockIn = row.querySelector(SELECTORS.MALAM_CLOCK_IN) as HTMLInputElement | null;
    const clockOut = row.querySelector(SELECTORS.MALAM_CLOCK_OUT) as HTMLInputElement | null;
    if (!clockIn || !clockOut) continue;
    if (entry.isVacation) {
      const workType = row.querySelector(SELECTORS.MALAM_WORK_TYPE) as HTMLSelectElement | null;
      if (workType) {
        workType.value = '1_0';
        triggerEvents(workType);
      }
    } else {
      clockIn.value = entry.entryTime;
      clockOut.value = entry.exitTime;
      triggerEvents(clockIn);
      triggerEvents(clockOut);
    }
    filledCount++;
  }
  if (filledCount === 0) throw new Error(ERROR_CODES.NO_DATA);
  return { count: filledCount };
}
function parseTimesheetFromDOM(): ParsedTimesheetRow[] {
  const rows: ParsedTimesheetRow[] = [];
  const processedDates = new Set<string>();
  for (const dateCell of document.querySelectorAll(SELECTORS.HILAN_DATE_CELL)) {
    const ov = dateCell.getAttribute('ov');
    if (!ov) continue;
    const normalizedOv = ov
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const match = normalizedOv.match(/^(\d{1,2}\/\d{1,2})\s+(.+)$/);
    if (!match) continue;
    const [, date, dayName] = match;
    if (!date || processedDates.has(date)) continue;
    processedDates.add(date);
    const row = dateCell.closest('tr');
    if (!row) continue;
    const isHoliday = dateCell.getAttribute('rowspan') === '2';
    const dataRow = isHoliday ? (row.nextElementSibling as HTMLElement) : row;
    if (!dataRow) continue;
    const cleanDay =
      dayName
        ?.replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() ?? '';
    let dayOfWeek = DAY_MAP[cleanDay] ?? -1;
    if (dayOfWeek === -1) {
      for (const [key, value] of Object.entries(DAY_MAP)) {
        if (cleanDay.startsWith(key) || cleanDay.includes(key)) {
          dayOfWeek = value;
          break;
        }
      }
    }
    if (dayOfWeek === -1) continue;
    const reportSelect = dataRow.querySelector(REPORT_TYPE_SELECTOR) as HTMLSelectElement | null;
    const reportValue = reportSelect?.value ?? '0';
    const isAbsence =
      reportSelect && reportSelect.options[reportSelect.selectedIndex]?.getAttribute('isabsencesymbol') === 'true';
    const reportType: 'regular' | 'vacation' | 'absence' =
      reportValue === '481' ? 'vacation' : isAbsence ? 'absence' : 'regular';
    const entryOv = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME)?.getAttribute('ov')?.trim() ?? '';
    const exitOv = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME)?.getAttribute('ov')?.trim() ?? '';
    const totalOv = dataRow.querySelector(TOTAL_CELL_SELECTOR)?.getAttribute('ov')?.trim() ?? '';
    const entryTime = isValidTime(entryOv) ? entryOv : '';
    const exitTime = isValidTime(exitOv) ? exitOv : '';
    let totalHours = 0;
    if (isValidTime(totalOv)) {
      totalHours = timeToDecimal(totalOv);
    } else if (entryTime && exitTime) {
      let e = timeToDecimal(exitTime);
      if (e < timeToDecimal(entryTime)) e += 24;
      totalHours = e - timeToDecimal(entryTime);
    }
    rows.push({ date, dayOfWeek, entryTime, exitTime, totalHours, reportType, isHoliday });
  }
  return rows;
}
function calculateSalary(rows: ParsedTimesheetRow[], hourlyRate: number): CalculatorResult {
  let regularHours = 0,
    nightHours = 0,
    vacationDays = 0,
    workDays = 0;
  let mealEligibleDays = 0,
    ot125Hours = 0,
    ot150Hours = 0;
  let periodStart = '',
    periodEnd = '',
    minDateVal = Infinity,
    maxDateVal = -Infinity;
  for (const row of rows) {
    const parts = row.date.split('/');
    const d = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const dateVal = m * 100 + d;
    if (dateVal < minDateVal) {
      minDateVal = dateVal;
      periodStart = row.date;
    }
    if (dateVal > maxDateVal) {
      maxDateVal = dateVal;
      periodEnd = row.date;
    }
    if (row.reportType === 'absence') continue;
    if (row.reportType === 'vacation') {
      vacationDays++;
      continue;
    }
    if (row.totalHours <= 0) continue;
    workDays++;
    const night = calculateNightHours(row.entryTime, row.exitTime, row.dayOfWeek);
    nightHours += night;
    regularHours += row.totalHours - night;
    if (row.totalHours >= CALC_CONSTANTS.MEAL_ELIGIBLE_HOURS) mealEligibleDays++;
    const ot = calculateOvertime(row.totalHours);
    ot125Hours += ot.ot125;
    ot150Hours += ot.ot150;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const regularPay = hourlyRate * regularHours;
  const nightPay = hourlyRate * CALC_CONSTANTS.NIGHT_MULTIPLIER * nightHours;
  const vacationPay = hourlyRate * CALC_CONSTANTS.VACATION_HOURS_PER_DAY * vacationDays;
  const workDaysPay = regularPay + nightPay;
  const travelRefund = CALC_CONSTANTS.TRAVEL_REFUND_PER_DAY * workDays;
  const mealRefund = CALC_CONSTANTS.MEAL_REFUND_PER_DAY * mealEligibleDays;
  const ot125Pay = hourlyRate * 0.25 * ot125Hours;
  const ot150Pay = hourlyRate * 0.5 * ot150Hours;
  const totalPay = regularPay + nightPay + vacationPay + travelRefund + mealRefund + ot125Pay + ot150Pay;
  return {
    totalPay: round(totalPay),
    regularHours: round(regularHours),
    regularPay: round(regularPay),
    nightHours: round(nightHours),
    nightPay: round(nightPay),
    vacationDays,
    vacationPay: round(vacationPay),
    workDays,
    workDaysPay: round(workDaysPay),
    travelRefund,
    mealRefund,
    mealEligibleDays,
    overtime125Hours: round(ot125Hours),
    overtime125Pay: round(ot125Pay),
    overtime150Hours: round(ot150Hours),
    overtime150Pay: round(ot150Pay),
    periodStart,
    periodEnd,
  };
}
async function trackAnalytics(event: 'autoClick' | 'copy' | 'paste', success: boolean) {
  const data = await storage.get(['analytics', 'statisticsEnabled']);
  if (data.statisticsEnabled === false) return;
  const analytics = { ...data.analytics };
  const op = analytics.operations[event];
  if (success) {
    op.success++;
    op.lastTime = new Date().toISOString();
  } else {
    op.failures++;
  }
  const ops = analytics.operations;
  const totalSuccess = ops.copy.success + ops.paste.success + ops.autoClick.success;
  const totalFailures = ops.copy.failures + ops.paste.failures + ops.autoClick.failures;
  analytics.totalOperations = totalSuccess + totalFailures;
  analytics.successRate =
    analytics.totalOperations > 0 ? Math.round((totalSuccess / analytics.totalOperations) * 100) : 0;
  await storage.set({ analytics });
}
