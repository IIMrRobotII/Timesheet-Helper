class AnalyticsDisplay {
  constructor(controller) {
    this.controller = controller;
    this.storage = controller.storage;
    this.i18n = controller.i18n;
    this.DEFAULT_SETTINGS = window.TimesheetCommon.DEFAULT_SETTINGS;
  }
  async loadAnalytics() {
    const data = await this.storage.getBatch(this.DEFAULT_SETTINGS);
    const analyticsSection = document.querySelector(".analytics-section");
    if (!analyticsSection) return;

    // Create stat item function
    const createStatItem = (label, value) =>
      `<div class="stat-item"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;

    // Calculate total operations
    const totalOperations =
      (data.totalCopies || 0) +
      (data.totalPastes || 0) +
      (data.totalAutoClicks || 0);

    // Generate analytics HTML
    const analyticsHtml = `
      <div class="analytics-header">
        <span class="analytics-icon">📊</span>
        <span class="analytics-title">${this.i18n.getMessage(
          "analyticsTitle"
        )}</span>
      </div>
      <div class="analytics-stats">
        ${createStatItem(
          this.i18n.getMessage("statLastCopied"),
          this.i18n.formatCounterValue(
            data.lastCopyTime,
            data.totalCopies || 0,
            data.copyFailures || 0
          )
        )}
        ${createStatItem(
          this.i18n.getMessage("statLastPasted"),
          this.i18n.formatCounterValue(
            data.lastPasteTime,
            data.totalPastes || 0,
            data.pasteFailures || 0
          )
        )}
        ${createStatItem(
          this.i18n.getMessage("statLastAutoClick"),
          this.i18n.formatCounterValue(
            data.lastAutoClickTime,
            data.totalAutoClicks || 0,
            data.autoClickFailures || 0
          )
        )}
        ${createStatItem(
          this.i18n.getMessage("statTotalOperations"),
          totalOperations.toString()
        )}
        ${createStatItem(
          this.i18n.getMessage("statSuccessRate"),
          `${data.successRate || 0}%`
        )}
      </div>
      <button id="clearDataButton" class="clear-data-button">
        <span class="clear-icon">🗑️</span>
        <span class="clear-text">${this.i18n.getMessage("clearAllData")}</span>
      </button>
    `;

    analyticsSection.innerHTML = analyticsHtml;

    // Set up clear data button event listener
    const clearButton = document.getElementById("clearDataButton");
    if (clearButton) {
      clearButton.addEventListener("click", () =>
        this.controller.handleClearData()
      );
    }
  }

  //Handle data clearing operation
  async handleClearData() {
    if (
      this.controller.isOperationInProgress ||
      !(await this.controller.uiManager.showModal())
    ) {
      return;
    }

    try {
      this.controller.uiManager.showStatus(
        `🗑️ ${this.i18n.getMessage("workingClearing")}`,
        "working"
      );

      await this.storage.clear();

      // Restore essential defaults after clearing
      await Promise.all(
        Object.entries(this.DEFAULT_SETTINGS)
          .map(([key, value]) => {
            if (key === "extensionEnabled" || key === "statisticsEnabled") {
              return this.storage.set(key, value);
            }
          })
          .filter(Boolean)
      );

      const uiManager = this.controller.uiManager;
      uiManager.elements.extensionToggle.checked = true;
      uiManager.elements.statisticsToggle.checked = true;
      uiManager.updateUIState(true);
      uiManager.updateStatisticsVisibility(true);

      await this.loadAnalytics();
      this.controller.uiManager.showStatus(
        `✅ ${this.i18n.getMessage("successCleared")}`,
        "success"
      );
    } catch (error) {
      this.controller.uiManager.showStatus(
        `❌ ${this.i18n.getMessage("errorClearDataFailed")}`,
        "error"
      );
    }
  }
}

// Export for popup
window.AnalyticsDisplay = AnalyticsDisplay;
