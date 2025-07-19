const { storage, STORAGE_KEYS, ERROR_CODES, TIMING, utils } =
  window.TimesheetCommon;
const { delay, detectSite, formatResponse } = utils;

//Main Extension Handler - Coordinates operations and handles messages
class TimesheetExtension {
  constructor() {
    this.isProcessing = false;

    this.analytics = new window.AnalyticsTracker();
    this.hilanOps = new window.HilanOperations();
    this.malamOps = new window.MalamOperations();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  //Handle messages from popup
  async handleMessage(request, sender, sendResponse) {
    try {
      // Check if extension is enabled
      if ((await storage.get(STORAGE_KEYS.ENABLED)) === false) {
        return sendResponse(
          formatResponse(false, { code: ERROR_CODES.EXT_DISABLED })
        );
      }

      // Check if another operation is in progress
      if (this.isProcessing) {
        return sendResponse(
          formatResponse(false, { code: ERROR_CODES.OPERATION_IN_PROGRESS })
        );
      }

      this.isProcessing = true;

      try {
        const result = await this.executeAction(request.action);
        sendResponse(result);
      } finally {
        this.isProcessing = false;
      }
    } catch (error) {
      sendResponse(
        formatResponse(false, {
          code: "UNEXPECTED_ERROR",
          message: error.message,
        })
      );
      this.isProcessing = false;
    }
  }

  //Execute the requested action
  async executeAction(action) {
    switch (action) {
      case "autoClickTimeBoxes":
        return await this.handleAutoClick();
      case "copyHours":
        return await this.handleCopyPaste();
      default:
        return formatResponse(false, { code: "INVALID_ACTION" });
    }
  }

  //Handle auto-click operation
  async handleAutoClick() {
    const currentSite = detectSite();
    if (!currentSite || currentSite.action !== "copy") {
      return formatResponse(false, { code: ERROR_CODES.WRONG_SITE });
    }

    try {
      const result = await this.hilanOps.performAutoClick();
      await this.analytics.track("autoClick", true, result);
      await delay(TIMING.OPERATION_DELAY);
      return formatResponse(true, result);
    } catch (error) {
      // Handle "all boxes already selected" as success, not error
      if (error.message === ERROR_CODES.ALL_BOXES_SELECTED) {
        await this.analytics.track("autoClick", true, {
          alreadySelected: true,
        });
        await delay(TIMING.OPERATION_DELAY);
        return formatResponse(true, { alreadySelected: true });
      }

      await this.analytics.track("autoClick", false, { error: error.message });
      await delay(TIMING.OPERATION_DELAY);
      return formatResponse(false, { code: ERROR_CODES.NO_TIME_BOXES });
    }
  }

  //Handle copy/paste operation
  async handleCopyPaste() {
    const currentSite = detectSite();
    if (!currentSite) {
      return formatResponse(false, { code: ERROR_CODES.WRONG_SITE });
    }

    try {
      let result;
      if (currentSite.action === "copy") {
        result = await this.hilanOps.copyTimesheetData();
        await this.analytics.track("copy", true, result);
      } else if (currentSite.action === "paste") {
        result = await this.malamOps.pasteTimesheetData();
        await this.analytics.track("paste", true, result);
      } else {
        throw new Error(ERROR_CODES.WRONG_SITE);
      }

      await delay(TIMING.OPERATION_DELAY);
      return formatResponse(true, result);
    } catch (error) {
      const eventType = currentSite.action === "copy" ? "copy" : "paste";
      await this.analytics.track(eventType, false, { error: error.message });
      await delay(TIMING.OPERATION_DELAY);
      const errorCode =
        currentSite.action === "copy"
          ? ERROR_CODES.COPY_FAILED
          : ERROR_CODES.PASTE_FAILED;
      return formatResponse(false, { code: errorCode });
    }
  }
}

// Initialize the extension
new TimesheetExtension();
