import { SELECTORS, ERROR_CODES, isValidTime, sanitizeTime, triggerEvents, delay } from "./sites";
import { DAY_MAP, timeToDecimal } from "./calc";
import { getSettings, setSettings } from "./storage";
import type { ParsedTimesheetRow, ReportType, TimesheetData } from "./types";

export async function performAutoClick(): Promise<{ clickedCount: number; totalBoxes: number; skippedCount: number }> {
  const boxes = Array.from(document.querySelectorAll(SELECTORS.HILAN_TIME_BOXES)).filter(
    (cell): cell is HTMLElement => {
      if (cell.classList.contains(SELECTORS.HILAN_CLICKED_CLASS)) return false;
      const title = cell.getAttribute("title");
      if (title?.includes("חופשה") || cell.textContent?.includes("חופשה")) return true;
      if (title && isValidTime(title.trim())) return true;
      const content = cell.querySelector(SELECTORS.HILAN_TIME_CONTENT);
      return Boolean(content && isValidTime(content.textContent?.trim() ?? ""));
    }
  );
  if (boxes.length === 0) throw new Error(ERROR_CODES.NO_TIME_BOXES);
  let clickedCount = 0;
  for (const box of boxes) {
    try {
      box.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
      clickedCount++;
      if (clickedCount < boxes.length) await delay(100);
    } catch {
      continue;
    }
  }
  return { clickedCount, totalBoxes: boxes.length, skippedCount: boxes.length - clickedCount };
}

export async function copyTimesheetData(): Promise<{ count: number }> {
  const timesheetData: TimesheetData = {};
  for (const row of Array.from(document.querySelectorAll("tr"))) {
    const dateCell = row.querySelector(SELECTORS.HILAN_DATE_CELL);
    const ov = dateCell?.getAttribute("ov");
    if (!ov) continue;
    const hilanDate = ov
      .replace(/\s+/g, " ")
      .trim()
      .match(/^(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/)?.[1];
    if (!hilanDate) continue;
    const isHolidayRow = dateCell?.getAttribute("rowspan") === "2";
    const dataRow = isHolidayRow ? (row.nextElementSibling as HTMLElement | null) : row;
    if (!dataRow) continue;
    const entryCell = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME);
    const exitCell = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME);
    if (!entryCell || !exitCell) continue;
    const entryTime = sanitizeTime(entryCell.getAttribute("ov"));
    const exitTime = sanitizeTime(exitCell.getAttribute("ov"));
    const symbolSelect = dataRow.querySelector<HTMLSelectElement>(SELECTORS.HILAN_SYMBOL);
    const isVacation =
      symbolSelect?.value === "481" || symbolSelect?.options[symbolSelect.selectedIndex]?.text.includes("חופשה");
    if (!isVacation && (!entryTime || !exitTime || !isValidTime(entryTime) || !isValidTime(exitTime))) continue;
    const dateParts = hilanDate.split("/");
    const dataMonth = parseInt(dateParts[1] || "0", 10);
    const now = new Date();
    const year = dataMonth > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    const malamDate = dateParts.length === 3 ? hilanDate : `${hilanDate}/${year}`;
    timesheetData[malamDate] = {
      entryTime: entryTime || "",
      exitTime: exitTime || "",
      originalHilanDate: hilanDate,
      isVacation,
    };
  }
  const count = Object.keys(timesheetData).length;
  if (count === 0) throw new Error(ERROR_CODES.NO_DATA);
  await setSettings({ timesheetData });
  return { count };
}

export async function pasteTimesheetData(): Promise<{ count: number }> {
  const { timesheetData } = await getSettings();
  if (!timesheetData || Object.keys(timesheetData).length === 0) throw new Error(ERROR_CODES.NO_DATA);
  let filledCount = 0;
  for (const row of Array.from(document.querySelectorAll(SELECTORS.MALAM_ROWS))) {
    const dateInput = row.querySelector<HTMLInputElement>(SELECTORS.MALAM_DATE_INPUT);
    if (!dateInput?.value) continue;
    const entry = timesheetData[dateInput.value.trim()];
    if (!entry) continue;
    const clockIn = row.querySelector<HTMLInputElement>(SELECTORS.MALAM_CLOCK_IN);
    const clockOut = row.querySelector<HTMLInputElement>(SELECTORS.MALAM_CLOCK_OUT);
    if (!clockIn || !clockOut) continue;
    if (entry.isVacation) {
      const workType = row.querySelector<HTMLSelectElement>(SELECTORS.MALAM_WORK_TYPE);
      if (workType) {
        workType.value = "1_0";
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

export function parseTimesheetFromDOM(): ParsedTimesheetRow[] {
  const rows: ParsedTimesheetRow[] = [];
  const processedDates = new Set<string>();
  for (const dateCell of document.querySelectorAll(SELECTORS.HILAN_DATE_CELL)) {
    const ov = dateCell.getAttribute("ov");
    if (!ov) continue;
    const normalizedOv = ov.replace(/\s+/g, " ").trim();
    const match = normalizedOv.match(/^(\d{1,2}\/\d{1,2})\s+(.+)$/);
    if (!match) continue;
    const [, date, dayName] = match;
    if (!date || processedDates.has(date)) continue;
    processedDates.add(date);
    const row = dateCell.closest("tr");
    if (!row) continue;
    const isHoliday = dateCell.getAttribute("rowspan") === "2";
    const dataRow = isHoliday ? (row.nextElementSibling as HTMLElement | null) : row;
    if (!dataRow) continue;
    const cleanDay = dayName?.replace(/\s+/g, " ").trim() ?? "";
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
    const reportSelect = dataRow.querySelector<HTMLSelectElement>(SELECTORS.HILAN_REPORT_TYPE);
    const reportValue = reportSelect?.value ?? "0";
    const isAbsence = reportSelect?.options[reportSelect.selectedIndex]?.getAttribute("isabsencesymbol") === "true";
    const reportType: ReportType = reportValue === "481" ? "vacation" : isAbsence ? "absence" : "regular";
    const entryOv = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME)?.getAttribute("ov")?.trim() ?? "";
    const exitOv = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME)?.getAttribute("ov")?.trim() ?? "";
    const totalOv = dataRow.querySelector(SELECTORS.HILAN_TOTAL)?.getAttribute("ov")?.trim() ?? "";
    const entryTime = isValidTime(entryOv) ? entryOv : "";
    const exitTime = isValidTime(exitOv) ? exitOv : "";
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
