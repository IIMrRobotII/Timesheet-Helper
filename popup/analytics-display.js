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

    // Clear existing content safely
    analyticsSection.textContent = "";

    // Calculate total operations
    const totalOperations =
      (data.totalCopies || 0) +
      (data.totalPastes || 0) +
      (data.totalAutoClicks || 0);

    // Create analytics header using DOM methods
    const header = this.createAnalyticsHeader();
    analyticsSection.appendChild(header);

    // Create analytics stats using DOM methods
    const statsContainer = this.createAnalyticsStats(data, totalOperations);
    analyticsSection.appendChild(statsContainer);

    // Create clear data button using DOM methods
    const clearButton = this.createClearDataButton();
    analyticsSection.appendChild(clearButton);

    // Set up clear data button event listener
    clearButton.addEventListener("click", () =>
      this.controller.handleClearData()
    );
  }

  // Secure DOM creation method for analytics header
  createAnalyticsHeader() {
    const header = document.createElement("div");
    header.className = "analytics-header";

    const icon = document.createElement("span");
    icon.className = "analytics-icon";
    icon.textContent = "📊";

    const title = document.createElement("span");
    title.className = "analytics-title";
    title.textContent = this.i18n.getMessage("analyticsTitle");

    header.appendChild(icon);
    header.appendChild(title);

    return header;
  }

  // Secure DOM creation method for analytics stats
  createAnalyticsStats(data, totalOperations) {
    const statsContainer = document.createElement("div");
    statsContainer.className = "analytics-stats";

    // Create stat items using secure DOM methods
    const statItems = [
      {
        label: this.i18n.getMessage("statLastCopied"),
        value: this.i18n.formatCounterValue(
          data.lastCopyTime,
          data.totalCopies || 0,
          data.copyFailures || 0
        ),
      },
      {
        label: this.i18n.getMessage("statLastPasted"),
        value: this.i18n.formatCounterValue(
          data.lastPasteTime,
          data.totalPastes || 0,
          data.pasteFailures || 0
        ),
      },
      {
        label: this.i18n.getMessage("statLastAutoClick"),
        value: this.i18n.formatCounterValue(
          data.lastAutoClickTime,
          data.totalAutoClicks || 0,
          data.autoClickFailures || 0
        ),
      },
      {
        label: this.i18n.getMessage("statTotalOperations"),
        value: totalOperations.toString(),
      },
      {
        label: this.i18n.getMessage("statSuccessRate"),
        value: `${data.successRate || 0}%`,
      },
    ];

    statItems.forEach((item) => {
      const statElement = this.createSecureStatItem(item.label, item.value);
      statsContainer.appendChild(statElement);
    });

    return statsContainer;
  }

  // Secure DOM creation method for individual stat items
  createSecureStatItem(label, value) {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";

    const statLabel = document.createElement("span");
    statLabel.className = "stat-label";
    statLabel.textContent = label;

    const statValue = document.createElement("span");
    statValue.className = "stat-value";
    statValue.textContent = value;

    statItem.appendChild(statLabel);
    statItem.appendChild(statValue);

    return statItem;
  }

  // Secure DOM creation method for clear data button
  createClearDataButton() {
    const button = document.createElement("button");
    button.id = "clearDataButton";
    button.className = "clear-data-button";

    const icon = document.createElement("span");
    icon.className = "clear-icon";
    icon.textContent = "🗑️";

    const text = document.createElement("span");
    text.className = "clear-text";
    text.textContent = this.i18n.getMessage("clearAllData");

    button.appendChild(icon);
    button.appendChild(text);

    return button;
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
