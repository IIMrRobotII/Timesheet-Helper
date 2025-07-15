class MalamOperations {
  constructor() {
    this.SELECTORS = window.TimesheetCommon.SELECTORS;
    this.ERROR_CODES = window.TimesheetCommon.ERROR_CODES;
    this.STORAGE_KEYS = window.TimesheetCommon.STORAGE_KEYS;
    this.storage = window.TimesheetCommon.storage;

    const { triggerEvents } = window.TimesheetCommon.utils;
    this.triggerEvents = triggerEvents;
  }

  //Paste timesheet data to Malam payroll system
  async pasteTimesheetData() {
    const timesheetData = await this.storage.get(this.STORAGE_KEYS.DATA);

    if (!timesheetData || Object.keys(timesheetData).length === 0) {
      throw new Error(this.ERROR_CODES.NO_DATA);
    }

    const rows = document.querySelectorAll(this.SELECTORS.MALAM_ROWS);
    let filledCount = 0;

    rows.forEach((row) => {
      const dateInput = row.querySelector(this.SELECTORS.MALAM_DATE_INPUT);
      if (!dateInput?.value) return;

      const dateValue = dateInput.value.trim();
      const timesheetEntry = timesheetData[dateValue];
      if (!timesheetEntry) return;

      const clockInInput = row.querySelector(this.SELECTORS.MALAM_CLOCK_IN);
      const clockOutInput = row.querySelector(this.SELECTORS.MALAM_CLOCK_OUT);
      if (!clockInInput || !clockOutInput) return;

      clockInInput.value = timesheetEntry.entryTime;
      clockOutInput.value = timesheetEntry.exitTime;

      this.triggerEvents(clockInInput);
      this.triggerEvents(clockOutInput);

      filledCount++;
    });

    if (filledCount === 0) {
      throw new Error(this.ERROR_CODES.NO_DATA);
    }

    return {
      count: filledCount,
    };
  }
}

// Export for content script
window.MalamOperations = MalamOperations;
