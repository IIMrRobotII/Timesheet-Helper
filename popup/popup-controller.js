const {
  storage: sharedStorage,
  DEFAULT_SETTINGS,
  CONTEXTS,
  utils,
} = window.TimesheetCommon;
const { detectSite, tabs } = utils;

const storage = {
  get: (keys) => sharedStorage.getBatch(keys),
  set: (key, value) => sharedStorage.set(key, value),
  clear: () => sharedStorage.clear(),
};

const DEFAULTS = DEFAULT_SETTINGS;

class PopupController {
  constructor() {
    this.currentContext = null;
    this.isOperationInProgress = false;
    this.modalResolve = null;
    this.i18n = window.i18nManager;
    this.storage = storage;
    this.DEFAULTS = DEFAULTS;

    this.init();
  }

  async init() {
    await this.i18n.init();
    window.popupController = this;

    this.currentContext = await this.detectCurrentContext();

    // Initialize managers in correct order
    this.uiManager = new window.UIManager(this);
    this.analyticsDisplay = new window.AnalyticsDisplay(this);
    this.languageManager = new window.LanguageManager(this);
    this.operationManager = new window.OperationManager(this);

    this.uiManager.cacheElements();
    this.uiManager.setupEventListeners();
    await this.loadAndApplySettings();

    this.uiManager.updateAllText();
    this.languageManager.updateLanguageDropdown();
    this.uiManager.removeNoTransition();
    this.uiManager.updateInterface(this.currentContext);
    this.uiManager.updateUIState(
      this.uiManager.elements.extensionToggle.checked,
      true
    );
    await this.analyticsDisplay.loadAnalytics();
  }

  //Detect current context (Hilan/Malam/Unknown)
  async detectCurrentContext() {
    try {
      const [tab] = await tabs.query({ active: true, currentWindow: true });
      if (!tab) return this.createContext(CONTEXTS.UNKNOWN);

      const site = detectSite(tab.url);
      if (site?.name === "HILAN") return this.createContext(CONTEXTS.HILAN);
      if (site?.name === "MALAM") return this.createContext(CONTEXTS.MALAM);
      return this.createContext(CONTEXTS.UNKNOWN);
    } catch {
      return this.createContext(CONTEXTS.UNKNOWN);
    }
  }

  //Create context object
  createContext(contextType) {
    return {
      name: this.i18n.getMessage(contextType.name),
      type: contextType.type,
      primaryAction: contextType.primaryAction,
    };
  }

  //Load and apply settings from storage
  async loadAndApplySettings() {
    const settings = await storage.get(DEFAULTS);
    this.uiManager.elements.extensionToggle.checked = settings.extensionEnabled;
    this.uiManager.elements.statisticsToggle.checked =
      settings.statisticsEnabled;
    this.uiManager.updateUIState(settings.extensionEnabled, true);
    this.uiManager.updateStatisticsVisibility(settings.statisticsEnabled);
    this.uiManager.updateButtonAvailability(this.currentContext, false);
  }

  //Handle extension toggle
  async handleExtensionToggle() {
    if (this.isOperationInProgress) return;
    const isEnabled = this.uiManager.elements.extensionToggle.checked;
    await storage.set("extensionEnabled", isEnabled);
    this.uiManager.updateUIState(isEnabled);
    this.uiManager.updateButtonAvailability(
      this.currentContext,
      this.isOperationInProgress
    );
  }

  //Handle statistics toggle
  async handleStatisticsToggle() {
    const isEnabled = this.uiManager.elements.statisticsToggle.checked;
    await storage.set("statisticsEnabled", isEnabled);
    this.uiManager.updateStatisticsVisibility(isEnabled);
  }

  //Handle auto-click operation
  async handleAutoClickOperation() {
    await this.operationManager.handleAutoClickOperation();
  }

  //Handle primary operation (copy/paste)
  async handlePrimaryOperation() {
    await this.operationManager.handlePrimaryOperation();
  }

  //Handle clear data operation
  async handleClearData() {
    await this.analyticsDisplay.handleClearData();
  }

  //Modal handling methods
  handleModalCancel() {
    this.uiManager.hideModal();
  }

  handleModalConfirm() {
    this.uiManager.confirmModal();
  }

  handleModalBackdrop(e) {
    if (e.target === this.uiManager.elements.confirmModal) {
      this.uiManager.hideModal();
    }
  }

  handleEscapeKey(e) {
    if (
      e.key === "Escape" &&
      !this.uiManager.elements.confirmModal?.classList.contains("hidden")
    ) {
      this.uiManager.hideModal();
    }
  }
}

// Initialize the popup
new PopupController();
