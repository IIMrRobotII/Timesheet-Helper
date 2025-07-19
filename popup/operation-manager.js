class OperationManager {
  constructor(controller) {
    this.controller = controller;
    this.i18n = controller.i18n;
    this.uiManager = controller.uiManager;
    this.StatusManager = window.StatusManager;
    this.tabs = window.TimesheetCommon.utils.tabs;
  }

  //Handle auto-click operation
  async handleAutoClickOperation() {
    if (this.controller.isOperationInProgress) return;
    const workingMessages = this.i18n.getWorkingMessages();

    if (this.controller.currentContext.primaryAction === "copy") {
      await this.performOperation(
        "autoClickTimeBoxes",
        this.i18n.getMessage("workingAutoClick"),
        workingMessages.autoClick,
        this.i18n.getMessage("autoClickButton"),
        this.uiManager.elements.autoClickButton
      );
    }
  }

  //Handle primary operation (copy/paste)
  async handlePrimaryOperation() {
    if (this.controller.isOperationInProgress) return;
    const workingMessages = this.i18n.getWorkingMessages();

    if (this.controller.currentContext.type !== "unknown") {
      const isSource = this.controller.currentContext.primaryAction === "copy";
      await this.performOperation(
        "copyHours",
        this.i18n.getMessage(isSource ? "workingCopying" : "workingPasting"),
        isSource ? workingMessages.copying : workingMessages.pasting,
        this.i18n.getMessage(isSource ? "copyHours" : "pasteHours"),
        this.uiManager.elements.copyHours
      );
    }
  }

  //Perform operation
  async performOperation(action, workingText, statusText, defaultText, button) {
    this.setOperationInProgress(true);
    this.uiManager.setButtonText(button, workingText);
    this.uiManager.showStatus(statusText, "working");

    try {
      const response = await this.sendMessage({ action });
      if (response.success) {
        const message = this.StatusManager.formatSuccessMessage(
          action,
          response,
          this.controller.currentContext,
          this.i18n
        );
        this.uiManager.showStatus(`✅ ${message}`, "success");
        await this.controller.analyticsDisplay.loadAnalytics();
      } else {
        this.uiManager.showStatus(
          `❌ ${this.StatusManager.getErrorMessage(response, this.i18n)}`,
          "error"
        );
        await this.controller.analyticsDisplay.loadAnalytics();
      }
    } catch (error) {
      this.uiManager.showStatus(
        this.StatusManager.getErrorFromException(error, this.i18n),
        "error"
      );
      // For communication failures, retry after delay; otherwise load immediately
      if (error.message.includes("Communication failed")) {
        setTimeout(
          () => this.controller.analyticsDisplay.loadAnalytics(),
          window.TimesheetCommon.TIMING.ANALYTICS_RETRY_DELAY
        );
      } else {
        await this.controller.analyticsDisplay.loadAnalytics();
      }
    } finally {
      this.uiManager.setButtonText(button, defaultText);
      this.setOperationInProgress(false);
    }
  }

  //Send message to content script
  async sendMessage(message) {
    const [tab] = await this.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      throw new Error("No active tab found");
    }
    return await this.tabs.sendMessage(tab.id, message);
  }

  //Set operation in progress state
  setOperationInProgress(inProgress) {
    this.controller.isOperationInProgress = inProgress;
    this.uiManager.updateButtonAvailability(
      this.controller.currentContext,
      inProgress
    );
  }
}

// Export for popup
window.OperationManager = OperationManager;
