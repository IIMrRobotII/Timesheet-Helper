window.WebsiteContextManager = {
  WEBSITE_CONFIGS: {
    HILAN_TIMESHEET: {
      displayName: "contextHilanTimesheet",
      type: "operational",
      primaryAction: "copy",
      enabledButtons: ["autoClick", "copy"],
      contextType: "source",
    },
    HILAN: {
      displayName: "contextHilan",
      type: "display-only",
      primaryAction: null,
      enabledButtons: [],
      contextType: "source",
    },
    MALAM: {
      displayName: "contextMalam",
      type: "operational",
      primaryAction: "paste",
      enabledButtons: ["paste"],
      contextType: "target",
    },
    UNKNOWN: {
      displayName: "unknownWebsite",
      type: "unknown",
      primaryAction: null,
      enabledButtons: [],
      contextType: "unknown",
    },
  },

  // Get website configuration by name
  getWebsiteConfig(websiteName) {
    return this.WEBSITE_CONFIGS[websiteName] || this.WEBSITE_CONFIGS.UNKNOWN;
  },

  // Check if website has operational capabilities (buttons enabled)
  hasOperationalCapability(websiteName) {
    const config = this.getWebsiteConfig(websiteName);
    return config.type === "operational" && config.primaryAction !== null;
  },

  // Check if specific button should be enabled for website
  isButtonEnabled(websiteName, buttonType) {
    const config = this.getWebsiteConfig(websiteName);
    return config.enabledButtons.includes(buttonType);
  },

  // Get button availability state for all buttons
  getButtonAvailability(
    websiteName,
    isExtensionEnabled,
    isOperationInProgress
  ) {
    const config = this.getWebsiteConfig(websiteName);
    const hasCapability = this.hasOperationalCapability(websiteName);

    return {
      autoClick:
        isExtensionEnabled &&
        this.isButtonEnabled(websiteName, "autoClick") &&
        config.primaryAction === "copy" &&
        !isOperationInProgress,

      copyHours: isExtensionEnabled && hasCapability && !isOperationInProgress,

      clearData: !isOperationInProgress,
    };
  },

  // Create standardized context object
  createContext(websiteName, i18nManager) {
    const config = this.getWebsiteConfig(websiteName);

    return {
      name: i18nManager.getMessage(config.displayName),
      type: config.contextType,
      primaryAction: config.primaryAction,
      websiteType: config.type,
      websiteName: websiteName, // Include original website name for direct access
    };
  },

  // Get context-specific UI messages
  getContextMessages(websiteName, i18nManager) {
    const config = this.getWebsiteConfig(websiteName);

    const messageMap = {
      source: {
        guidance: i18nManager.getMessage("guidanceTextSource"),
        buttonText: i18nManager.getMessage("copyHours"),
      },
      target: {
        guidance: i18nManager.getMessage("guidanceTextTarget"),
        buttonText: i18nManager.getMessage("pasteHours"),
      },
      unknown: {
        guidance: i18nManager.getMessage("guidanceTextDefault"),
        buttonText: i18nManager.getMessage("syncHours"),
      },
    };

    const messages = messageMap[config.contextType] || messageMap.unknown;

    return {
      name: i18nManager.getMessage(config.displayName),
      guidance: messages.guidance,
      buttonText: messages.buttonText,
    };
  },
};
