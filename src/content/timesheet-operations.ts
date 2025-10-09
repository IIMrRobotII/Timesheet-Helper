import {
  SELECTORS,
  ERROR_CODES,
  storage,
  utils,
  TIMINGS,
} from '@/shared/common';
import { StatusManager } from '@/shared/status-manager';
import type {
  AutoClickResult,
  OperationResult,
  TimesheetData,
  TimesheetEntry,
  StorageSchema,
} from '@/types';

export class TimesheetOperations {
  async performAutoClick(): Promise<AutoClickResult> {
    const timeBoxes = this.findClickableTimeBoxes();

    if (timeBoxes.length === 0) {
      throw StatusManager.createError(ERROR_CODES['NO_TIME_BOXES']!);
    }

    let clickedCount = 0;
    for (let i = 0; i < timeBoxes.length; i++) {
      try {
        const element = timeBoxes[i];
        if (element) {
          element.dispatchEvent(
            new MouseEvent('dblclick', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
          clickedCount++;
        }
        if (i < timeBoxes.length - 1) {
          await utils.delay(TIMINGS.HILAN_DOUBLE_CLICK_INTERVAL_MS);
        }
      } catch (error) {
        // Skip failed clicks silently
      }
    }

    return {
      clickedCount,
      totalBoxes: timeBoxes.length,
      skippedCount: timeBoxes.length - clickedCount,
    };
  }

  findClickableTimeBoxes(): HTMLElement[] {
    const timeBoxes = Array.from(
      document.querySelectorAll(SELECTORS.HILAN_TIME_BOXES)
    );

    return timeBoxes.filter((cell): cell is HTMLElement => {
      if (cell.classList.contains(SELECTORS.HILAN_CLICKED_CLASS)) {
        return false;
      }

      const title = cell.getAttribute('title');
      if (title && utils.isValidTime(title.trim())) {
        return true;
      }

      const timeContent = cell.querySelector(SELECTORS.HILAN_TIME_CONTENT);
      return Boolean(
        timeContent && utils.isValidTime(timeContent.textContent?.trim() ?? '')
      );
    });
  }

  async copyTimesheetData(): Promise<OperationResult> {
    const timesheetData: TimesheetData = {};
    const rows = Array.from(document.querySelectorAll('tr'));

    for (const row of rows) {
      const dateCell = row.querySelector(SELECTORS.HILAN_DATE_CELL);
      if (!dateCell) {
        continue;
      }

      const ovAttribute = dateCell.getAttribute('ov');
      if (!ovAttribute) {
        continue;
      }

      const hilanDate = ovAttribute.split(' ')[0];
      if (!hilanDate?.includes('/')) {
        continue;
      }

      // Check if this is a holiday row (rowspan="2")
      const rowspan = dateCell.getAttribute('rowspan');
      const isHolidayRow = rowspan === '2';

      // For holidays, time data is in the next sibling row
      const dataRow = isHolidayRow
        ? (row.nextElementSibling as HTMLElement)
        : row;
      if (!dataRow) {
        continue;
      }

      const entryTimeCell = dataRow.querySelector(SELECTORS.HILAN_ENTRY_TIME);
      const exitTimeCell = dataRow.querySelector(SELECTORS.HILAN_EXIT_TIME);
      if (!entryTimeCell || !exitTimeCell) {
        continue;
      }

      const entryTime = utils.sanitizeTime(entryTimeCell.getAttribute('ov'));
      const exitTime = utils.sanitizeTime(exitTimeCell.getAttribute('ov'));
      if (
        !entryTime ||
        !exitTime ||
        !utils.isValidTime(entryTime) ||
        !utils.isValidTime(exitTime)
      ) {
        continue;
      }

      const malamDate = hilanDate.includes('/')
        ? `${hilanDate}/${new Date().getFullYear()}`
        : null;
      if (!malamDate) {
        continue;
      }

      timesheetData[malamDate] = {
        entryTime,
        exitTime,
        originalHilanDate: hilanDate,
      };
    }

    const entryCount = Object.keys(timesheetData).length;
    if (entryCount === 0) {
      throw StatusManager.createError(ERROR_CODES['NO_DATA']!);
    }

    await storage.set({ timesheetData });

    return {
      count: entryCount,
    };
  }

  async pasteTimesheetData(): Promise<OperationResult> {
    const data = (await storage.get([
      'timesheetData',
    ])) as Partial<StorageSchema>;
    const timesheetData = data.timesheetData as TimesheetData | undefined;

    if (!timesheetData || Object.keys(timesheetData).length === 0) {
      throw StatusManager.createError(ERROR_CODES['NO_DATA']!);
    }

    const rows = Array.from(document.querySelectorAll(SELECTORS.MALAM_ROWS));
    let filledCount = 0;

    for (const row of rows) {
      const dateInput = row.querySelector(
        SELECTORS.MALAM_DATE_INPUT
      ) as HTMLInputElement | null;
      if (!dateInput?.value) {
        continue;
      }

      const dateValue = dateInput.value.trim();
      const timesheetEntry: TimesheetEntry | undefined =
        timesheetData[dateValue];
      if (!timesheetEntry) {
        continue;
      }

      const clockInInput = row.querySelector(
        SELECTORS.MALAM_CLOCK_IN
      ) as HTMLInputElement | null;
      const clockOutInput = row.querySelector(
        SELECTORS.MALAM_CLOCK_OUT
      ) as HTMLInputElement | null;
      if (!clockInInput || !clockOutInput) {
        continue;
      }

      clockInInput.value = timesheetEntry.entryTime;
      clockOutInput.value = timesheetEntry.exitTime;

      utils.triggerEvents(clockInInput);
      utils.triggerEvents(clockOutInput);

      filledCount++;
    }

    if (filledCount === 0) {
      throw StatusManager.createError(ERROR_CODES['NO_DATA']!);
    }

    return {
      count: filledCount,
    };
  }
}

export default TimesheetOperations;
