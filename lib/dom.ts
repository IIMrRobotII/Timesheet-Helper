import {
  SELECTORS,
  ERROR_CODES,
  isValidTime,
  sanitizeTime,
  triggerEvents,
  delay,
  dominantPeriod,
  hebrewMonthToPeriod,
  parseHilanDate,
  type Period,
} from "./sites";
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

function buildTimesheetData(): TimesheetData {
  const timesheetData: TimesheetData = {};
  for (const row of Array.from(document.querySelectorAll("tr"))) {
    const dateCell = row.querySelector(SELECTORS.HILAN_DATE_CELL);
    const ov = dateCell?.getAttribute("ov");
    if (!ov) continue;
    const parsed = parseHilanDate(ov);
    if (!parsed) continue;
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
    const now = new Date();
    const year = parsed.month > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    const malamDate = parsed.year !== null ? parsed.text : `${parsed.text}/${year}`;
    timesheetData[malamDate] = {
      entryTime: entryTime || "",
      exitTime: exitTime || "",
      originalHilanDate: parsed.text,
      isVacation,
    };
  }
  return timesheetData;
}

async function copyOnce(): Promise<{ count: number } | null> {
  const timesheetData = buildTimesheetData();
  const count = Object.keys(timesheetData).length;
  if (count === 0) return null;
  await setSettings({ timesheetData });
  return { count };
}

export async function copyTimesheetData(): Promise<{ count: number }> {
  const result = await copyOnce();
  if (!result) throw new Error(ERROR_CODES.NO_DATA);
  return result;
}

const COPY_RETRY_MS = 8000;
const COPY_POLL_MS = 300;
const COPY_STABLE_MS = 600;

export async function autoClickThenCopy(): Promise<{ count: number }> {
  await performAutoClick();
  const deadline = Date.now() + COPY_RETRY_MS;
  let lastResult: { count: number } | null = null;
  let lastCount: number | null = null;
  let stableSince = 0;
  while (Date.now() < deadline) {
    const result = await copyOnce();
    const now = Date.now();
    if (result) {
      if (result.count !== lastCount) {
        lastCount = result.count;
        stableSince = now;
      }
      lastResult = result;
      if (now - stableSince >= COPY_STABLE_MS) return result;
    }
    await delay(COPY_POLL_MS);
  }
  if (lastResult) return lastResult;
  throw new Error(ERROR_CODES.NO_DATA);
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
    const parsed = parseHilanDate(normalizedOv);
    if (!parsed) continue;
    const date = parsed.text;
    if (processedDates.has(date)) continue;
    processedDates.add(date);
    const row = dateCell.closest("tr");
    if (!row) continue;
    const isHoliday = dateCell.getAttribute("rowspan") === "2";
    const dataRow = isHoliday ? (row.nextElementSibling as HTMLElement | null) : row;
    if (!dataRow) continue;
    const cleanDay = normalizedOv.slice(date.length).trim();
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

export function readHilanMonth(): Period {
  const label = document.querySelector(SELECTORS.HILAN_MONTH_LABEL)?.textContent;
  if (label) {
    const fromLabel = hebrewMonthToPeriod(label);
    if (fromLabel.month !== null) return fromLabel;
  }
  const dates: string[] = [];
  for (const cell of document.querySelectorAll(SELECTORS.HILAN_DATE_CELL)) {
    const ov = cell.getAttribute("ov");
    if (ov) dates.push(ov);
  }
  return dominantPeriod(dates);
}

export function readMalamMonth(): Period {
  const dates: string[] = [];
  for (const row of document.querySelectorAll(SELECTORS.MALAM_ROWS)) {
    const value = row.querySelector<HTMLInputElement>(SELECTORS.MALAM_DATE_INPUT)?.value;
    if (value) dates.push(value);
  }
  return dominantPeriod(dates);
}
