import {
  storage,
  SELECTORS,
  ERROR_CODES,
  detectSite,
  delay,
  isValidTime,
  sanitizeTime,
  triggerEvents,
} from '../lib';
import type {
  ExtensionMessage,
  ExtensionResponse,
  TimesheetData,
} from '../types';

let isProcessing = false;
const currentSite = detectSite(location.href);

chrome.runtime.onMessage.addListener(
  (
    request: ExtensionMessage,
    _sender,
    sendResponse: (r: ExtensionResponse) => void
  ) => {
    handleMessage(request, sendResponse);
    return true;
  }
);

async function handleMessage(
  request: ExtensionMessage,
  sendResponse: (r: ExtensionResponse) => void
) {
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
    const result = await executeAction(request.action);
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

async function executeAction(action: string): Promise<ExtensionResponse> {
  const timestamp = new Date().toISOString();
  if (!currentSite)
    return {
      success: false,
      timestamp,
      error: { code: ERROR_CODES.WRONG_SITE },
    };

  try {
    let eventType: 'autoClick' | 'copy' | 'paste';
    let result: {
      count?: number;
      clickedCount?: number;
      totalBoxes?: number;
      skippedCount?: number;
    };

    if (action === 'autoClickTimeBoxes') {
      if (currentSite.action !== 'copy')
        return {
          success: false,
          timestamp,
          error: { code: ERROR_CODES.WRONG_SITE },
        };
      result = await performAutoClick();
      eventType = 'autoClick';
    } else if (action === 'copyHours') {
      if (currentSite.action === 'copy') {
        result = await copyTimesheetData();
        eventType = 'copy';
      } else if (currentSite.action === 'paste') {
        result = await pasteTimesheetData();
        eventType = 'paste';
      } else throw new Error(ERROR_CODES.WRONG_SITE);
    } else {
      return { success: false, timestamp, error: { code: 'INVALID_ACTION' } };
    }

    await trackAnalytics(eventType, true);
    await delay(100);
    return { success: true, timestamp, ...result };
  } catch (e) {
    const eventType =
      action === 'autoClickTimeBoxes'
        ? 'autoClick'
        : currentSite.action === 'copy'
          ? 'copy'
          : 'paste';
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

// Auto-click time boxes
async function performAutoClick() {
  const boxes = Array.from(
    document.querySelectorAll(SELECTORS.HILAN_TIME_BOXES)
  ).filter((cell): cell is HTMLElement => {
    if (cell.classList.contains(SELECTORS.HILAN_CLICKED_CLASS)) return false;
    const title = cell.getAttribute('title');
    if (title?.includes('חופשה') || cell.textContent?.includes('חופשה'))
      return true;
    if (title && isValidTime(title.trim())) return true;
    const content = cell.querySelector(SELECTORS.HILAN_TIME_CONTENT);
    return Boolean(content && isValidTime(content.textContent?.trim() ?? ''));
  });

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
      /* Skip failed clicks */
    }
  }
  return {
    clickedCount,
    totalBoxes: boxes.length,
    skippedCount: boxes.length - clickedCount,
  };
}

// Copy from Hilan
async function copyTimesheetData() {
  const timesheetData: TimesheetData = {};
  for (const row of Array.from(document.querySelectorAll('tr'))) {
    const dateCell = row.querySelector(SELECTORS.HILAN_DATE_CELL);
    const ov = dateCell?.getAttribute('ov');
    if (!ov) continue;
    const hilanDate = ov.split(' ')[0];
    if (!hilanDate?.includes('/')) continue;

    const isHolidayRow = dateCell?.getAttribute('rowspan') === '2';
    const dataRow = isHolidayRow
      ? (row.nextElementSibling as HTMLElement)
      : row;
    if (!dataRow) continue;

    const entryCell = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME);
    const exitCell = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME);
    if (!entryCell || !exitCell) continue;

    const entryTime = sanitizeTime(entryCell.getAttribute('ov'));
    const exitTime = sanitizeTime(exitCell.getAttribute('ov'));
    const symbolSelect = dataRow.querySelector(
      SELECTORS.HILAN_SYMBOL
    ) as HTMLSelectElement | null;
    const isVacation =
      symbolSelect?.value === '481' ||
      symbolSelect?.options[symbolSelect.selectedIndex]?.text.includes('חופשה');

    if (
      !isVacation &&
      (!entryTime ||
        !exitTime ||
        !isValidTime(entryTime) ||
        !isValidTime(exitTime))
    )
      continue;

    // Determine year: if data month > current month, it's from last year
    const dataMonth = parseInt(hilanDate.split('/')[1] || '0', 10);
    const now = new Date();
    const year = dataMonth > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    const malamDate = `${hilanDate}/${year}`;
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

// Paste to Malam
async function pasteTimesheetData() {
  const data = await storage.get(['timesheetData']);
  const timesheetData = data.timesheetData;
  if (!timesheetData || Object.keys(timesheetData).length === 0)
    throw new Error(ERROR_CODES.NO_DATA);

  let filledCount = 0;
  for (const row of Array.from(
    document.querySelectorAll(SELECTORS.MALAM_ROWS)
  )) {
    const dateInput = row.querySelector(
      SELECTORS.MALAM_DATE_INPUT
    ) as HTMLInputElement | null;
    if (!dateInput?.value) continue;
    const entry = timesheetData[dateInput.value.trim()];
    if (!entry) continue;

    const clockIn = row.querySelector(
      SELECTORS.MALAM_CLOCK_IN
    ) as HTMLInputElement | null;
    const clockOut = row.querySelector(
      SELECTORS.MALAM_CLOCK_OUT
    ) as HTMLInputElement | null;
    if (!clockIn || !clockOut) continue;

    if (entry.isVacation) {
      const workType = row.querySelector(
        SELECTORS.MALAM_WORK_TYPE
      ) as HTMLSelectElement | null;
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

// Analytics tracking
async function trackAnalytics(
  event: 'autoClick' | 'copy' | 'paste',
  success: boolean
) {
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
  const totalSuccess =
    analytics.operations.copy.success +
    analytics.operations.paste.success +
    analytics.operations.autoClick.success;
  const totalFailures =
    analytics.operations.copy.failures +
    analytics.operations.paste.failures +
    analytics.operations.autoClick.failures;
  analytics.totalOperations = totalSuccess + totalFailures;
  analytics.successRate =
    analytics.totalOperations > 0
      ? Math.round((totalSuccess / analytics.totalOperations) * 100)
      : 0;
  await storage.set({ analytics });
}
