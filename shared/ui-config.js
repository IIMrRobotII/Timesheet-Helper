window.UIConfig = {
  //DOM element selectors for caching
  ELEMENTS: {
    container: ".container",
    contextBadge: ".context-badge",
    toggleLabel: ".toggle-label",
    guidanceText: ".guidance-text",
    statusDiv: "#status",
    analyticsSection: ".analytics-section",
    confirmModal: "#confirmModal",
    extensionToggle: "#extensionToggle",
    statisticsToggle: "#statisticsToggle",
    autoClickButton: "#autoClickButton",
    copyHours: "#copyHours",
    languageToggle: "#languageToggle",
    languageDropdown: "#languageDropdown",
  },

  //Event listener configurations
  EVENT_CONFIGS: [
    {
      selector: "#extensionToggle",
      event: "change",
      handler: "handleExtensionToggle",
      context: "popup",
    },
    {
      selector: "#statisticsToggle",
      event: "change",
      handler: "handleStatisticsToggle",
      context: "popup",
    },
    {
      selector: "#autoClickButton",
      event: "click",
      handler: "handleAutoClickOperation",
      context: "popup",
    },
    {
      selector: "#copyHours",
      event: "click",
      handler: "handlePrimaryOperation",
      context: "popup",
    },
    {
      selector: "#languageToggle",
      event: "click",
      handler: "handleLanguageToggle",
      context: "language",
      preventDefault: true,
      stopPropagation: true,
    },
    {
      selector: document,
      event: "click",
      handler: "handleDocumentClick",
      context: "language",
    },
    {
      selector: document,
      event: "keydown",
      handler: "handleEscapeKey",
      context: "modal",
    },
    {
      selector: ".language-option",
      event: "click",
      handler: "handleLanguageOption",
      context: "language",
      multiple: true,
    },
    {
      selector: "#modalCancel",
      event: "click",
      handler: "handleModalCancel",
      context: "modal",
    },
    {
      selector: "#modalConfirm",
      event: "click",
      handler: "handleModalConfirm",
      context: "modal",
    },
    {
      selector: "#confirmModal",
      event: "click",
      handler: "handleModalBackdrop",
      context: "modal",
    },
  ],

  //Toggle configurations for settings
  TOGGLE_CONFIGS: [
    {
      id: "extensionToggle",
      storageKey: "extensionEnabled",
      handler: "handleExtensionToggle",
      defaultValue: true,
      affects: ["ui-state", "button-availability"],
    },
    {
      id: "statisticsToggle",
      storageKey: "statisticsEnabled",
      handler: "handleStatisticsToggle",
      defaultValue: true,
      affects: ["analytics-visibility"],
    },
  ],

  //Button configurations for operations
  BUTTON_CONFIGS: [
    {
      id: "autoClickButton",
      action: "autoClickTimeBoxes",
      contexts: ["source"], // Only available on Hilan
      requirements: ["extension-enabled", "valid-context"],
      workingMessageKey: "workingAutoClick",
      defaultTextKey: "autoClickButton",
      icon: "🔄",
    },
    {
      id: "copyHours",
      action: "copyHours",
      contexts: ["source", "target"], // Available on both sites
      requirements: ["extension-enabled", "valid-context"],
      workingMessageKey: null, // Dynamic based on context
      defaultTextKey: null, // Dynamic based on context
      icon: null, // Dynamic based on context
    },
  ],

  //Context-specific UI configurations
  CONTEXT_CONFIGS: {
    source: {
      badge: {
        class: "context-badge source",
        nameKey: "contextHilan",
      },
      guidance: {
        textKey: "guidanceTextSource",
      },
      primaryButton: {
        textKey: "copyHours",
        icon: "📋",
        workingMessageKey: "workingCopying",
      },
    },
    target: {
      badge: {
        class: "context-badge target",
        nameKey: "contextMalam",
      },
      guidance: {
        textKey: "guidanceTextTarget",
      },
      primaryButton: {
        textKey: "pasteHours",
        icon: "📝",
        workingMessageKey: "workingPasting",
      },
    },
    unknown: {
      badge: {
        class: "context-badge unknown",
        nameKey: "unknownWebsite",
      },
      guidance: {
        textKey: "guidanceTextDefault",
      },
      primaryButton: {
        textKey: "syncHours",
        icon: "📋",
        workingMessageKey: null,
      },
    },
  },

  //UI state transition configurations
  STATE_TRANSITIONS: {
    enabled: {
      containerClasses: ["expanded"],
      containerRemoveClasses: ["collapsed"],
      bodyWidth: "270px",
      labelTextKey: "extensionEnabled",
    },
    disabled: {
      containerClasses: ["collapsed"],
      containerRemoveClasses: ["expanded"],
      bodyWidth: "180px",
      labelTextKey: "extensionDisabled",
    },
  },

  //Analytics display configuration
  ANALYTICS_CONFIG: {
    stats: [
      {
        labelKey: "statLastCopied",
        valueType: "timestamp-counter",
        timestampKey: "lastCopyTime",
        countKey: "totalCopies",
        failureKey: "copyFailures",
      },
      {
        labelKey: "statLastPasted",
        valueType: "timestamp-counter",
        timestampKey: "lastPasteTime",
        countKey: "totalPastes",
        failureKey: "pasteFailures",
      },
      {
        labelKey: "statLastAutoClick",
        valueType: "timestamp-counter",
        timestampKey: "lastAutoClickTime",
        countKey: "totalAutoClicks",
        failureKey: "autoClickFailures",
      },
      {
        labelKey: "statTotalOperations",
        valueType: "computed-total",
        computeFrom: ["totalCopies", "totalPastes", "totalAutoClicks"],
      },
      {
        labelKey: "statSuccessRate",
        valueType: "percentage",
        sourceKey: "successRate",
      },
    ],
  },

  //Language configuration
  LANGUAGE_CONFIG: {
    supported: ["en", "he"],
    rtlLanguages: ["he", "ar", "fa", "ur"],
    options: [
      { code: "en", textKey: "languageEnglish" },
      { code: "he", textKey: "languageHebrew" },
    ],
  },
};
