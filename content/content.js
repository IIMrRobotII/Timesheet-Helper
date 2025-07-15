const { storage, STORAGE_KEYS, ERROR_CODES, utils } = window.TimesheetCommon;
const { delay, detectSite } = utils;

const { formatResponse } = window.StatusManager;

//Main Extension Handler - Coordinates operations and handles messages
class TimesheetExtension {
  constructor() {
    this.isProcessing = false;
    this.currentSite = detectSite();

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
      console.error("Error in message processing:", error);
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
    if (!this.currentSite || this.currentSite.action !== "copy") {
      return formatResponse(false, { code: ERROR_CODES.WRONG_SITE });
    }

    try {
      const result = await this.hilanOps.performAutoClick();
      await this.analytics.track("autoClick", true, result);
      await delay(100);
      return formatResponse(true, result);
    } catch (error) {
      await this.analytics.track("autoClick", false, { error: error.message });
      await delay(100);
      return formatResponse(false, { code: ERROR_CODES.NO_TIME_BOXES });
    }
  }

  //Handle copy/paste operation
  async handleCopyPaste() {
    if (!this.currentSite) {
      return formatResponse(false, { code: ERROR_CODES.WRONG_SITE });
    }

    try {
      let result;
      if (this.currentSite.action === "copy") {
        result = await this.hilanOps.copyTimesheetData();
        await this.analytics.track("copy", true, result);
      } else if (this.currentSite.action === "paste") {
        result = await this.malamOps.pasteTimesheetData();
        await this.analytics.track("paste", true, result);
      } else {
        throw new Error(ERROR_CODES.WRONG_SITE);
      }

      await delay(100);
      return formatResponse(true, result);
    } catch (error) {
      const eventType = this.currentSite.action === "copy" ? "copy" : "paste";
      await this.analytics.track(eventType, false, { error: error.message });
      await delay(100);
      const errorCode =
        this.currentSite.action === "copy"
          ? ERROR_CODES.COPY_FAILED
          : ERROR_CODES.PASTE_FAILED;
      return formatResponse(false, { code: errorCode });
    }
  }
}

// Initialize the extension
new TimesheetExtension();
