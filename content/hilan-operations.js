class HilanOperations {
  constructor() {
    this.SELECTORS = window.TimesheetCommon.SELECTORS;
    this.ERROR_CODES = window.TimesheetCommon.ERROR_CODES;
    this.STORAGE_KEYS = window.TimesheetCommon.STORAGE_KEYS;
    this.storage = window.TimesheetCommon.storage;

    const { isValidTime, sanitizeTime, delay } = window.TimesheetCommon.utils;
    this.isValidTime = isValidTime;
    this.sanitizeTime = sanitizeTime;
    this.delay = delay;
  }

  //Perform auto-click operation on time boxes
  async performAutoClick() {
    const timeBoxes = this.findClickableTimeBoxes();

    if (timeBoxes.length === 0) {
      throw new Error(this.ERROR_CODES.NO_TIME_BOXES);
    }

    let clickedCount = 0;
    for (let i = 0; i < timeBoxes.length; i++) {
      try {
        timeBoxes[i].dispatchEvent(
          new MouseEvent("dblclick", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
        clickedCount++;
        if (i < timeBoxes.length - 1) await this.delay(100);
      } catch (error) {
        // Skip failed clicks silently - they're often due to invalid elements
      }
    }

    return {
      clickedCount,
      totalBoxes: timeBoxes.length,
      skippedCount: timeBoxes.length - clickedCount,
    };
  }

  //Find clickable time boxes
  findClickableTimeBoxes() {
    return Array.from(
      document.querySelectorAll(this.SELECTORS.HILAN_TIME_BOXES)
    ).filter((cell) => {
      if (cell.classList.contains(this.SELECTORS.HILAN_CLICKED_CLASS))
        return false;

      const title = cell.getAttribute("title");
      if (title && this.isValidTime(title.trim())) return true;

      const timeContent = cell.querySelector(this.SELECTORS.HILAN_TIME_CONTENT);
      return timeContent && this.isValidTime(timeContent.textContent.trim());
    });
  }

  //Copy timesheet data from Hilan
  async copyTimesheetData() {
    const timesheetData = {};
    const rows = document.querySelectorAll("tr");

    rows.forEach((row) => {
      const dateCell = row.querySelector(this.SELECTORS.HILAN_DATE_CELL);
      if (!dateCell) return;

      const ovAttribute = dateCell.getAttribute("ov");
      if (!ovAttribute) return;

      const hilanDate = ovAttribute.split(" ")[0];
      if (!hilanDate?.includes("/")) return;

      const entryTimeCell = row.querySelector(this.SELECTORS.HILAN_ENTRY_TIME);
      const exitTimeCell = row.querySelector(this.SELECTORS.HILAN_EXIT_TIME);
      if (!entryTimeCell || !exitTimeCell) return;

      const entryTime = this.sanitizeTime(entryTimeCell.getAttribute("ov"));
      const exitTime = this.sanitizeTime(exitTimeCell.getAttribute("ov"));
      if (
        !entryTime ||
        !exitTime ||
        !this.isValidTime(entryTime) ||
        !this.isValidTime(exitTime)
      )
        return;

      const malamDate = hilanDate.includes("/")
        ? `${hilanDate}/${new Date().getFullYear()}`
        : null;
      if (!malamDate) return;

      timesheetData[malamDate] = {
        entryTime,
        exitTime,
        originalHilanDate: hilanDate,
      };
    });

    const entryCount = Object.keys(timesheetData).length;
    if (entryCount === 0) {
      throw new Error(this.ERROR_CODES.NO_DATA);
    }

    await this.storage.set(this.STORAGE_KEYS.DATA, timesheetData);

    return {
      count: entryCount,
    };
  }
}

// Export for content script
window.HilanOperations = HilanOperations;
