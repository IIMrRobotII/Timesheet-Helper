class UIManager {
  constructor(controller) {
    this.controller = controller;
    this.elements = {};
    this.UI_CONFIG = window.UIConfig;
    this.StatusManager = window.StatusManager;
    this.i18n = controller.i18n;
  }

  //Cache DOM elements for efficient access
  cacheElements() {
    Object.entries(this.UI_CONFIG.ELEMENTS).forEach(([key, selector]) => {
      if (selector === document) {
        this.elements[key] = document;
      } else {
        this.elements[key] =
          typeof selector === "string"
            ? document.querySelector(selector)
            : selector;
      }
    });
  }

  //Set up event listeners using configuration
  setupEventListeners() {
    this.UI_CONFIG.EVENT_CONFIGS.forEach((config) => {
      if (config.multiple) {
        // Handle multiple elements (like language options)
        document.querySelectorAll(config.selector).forEach((element) => {
          this.addEventListenerWithConfig(element, config);
        });
      } else if (config.selector === document) {
        // Handle document-level events
        this.addEventListenerWithConfig(document, config);
      } else {
        // Handle single elements
        const element =
          typeof config.selector === "string"
            ? document.querySelector(config.selector)
            : config.selector;
        if (element) {
          this.addEventListenerWithConfig(element, config);
        }
      }
    });
  }

  //Add event listener with configuration options
  addEventListenerWithConfig(element, config) {
    const handler = (e) => {
      if (config.preventDefault) e.preventDefault();
      if (config.stopPropagation) e.stopPropagation();

      // Route to appropriate manager based on context
      switch (config.context) {
        case "popup":
          this.controller[config.handler](e);
          break;
        case "language":
          this.controller.languageManager[config.handler](e);
          break;
        case "modal":
          this.controller[config.handler](e);
          break;
        default:
          if (typeof this.controller[config.handler] === "function") {
            this.controller[config.handler](e);
          }
      }
    };

    element.addEventListener(config.event, handler);
  }

  //Update all text content using i18n
  updateAllText() {
    document.title = this.i18n.getMessage("pageTitle");
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = this.i18n.getMessage(
        element.getAttribute("data-i18n")
      );
    });
  }

  //Update interface based on current context
  updateInterface(currentContext) {
    if (this.elements.contextBadge) {
      this.elements.contextBadge.textContent = currentContext.name;
      this.elements.contextBadge.className = `context-badge ${currentContext.type}`;
    }

    const contextMessages = this.i18n.getContextMessages(currentContext.type);
    if (this.elements.guidanceText) {
      this.elements.guidanceText.textContent = contextMessages.guidance;
    }

    const buttonText = this.elements.copyHours?.querySelector(".button-text");
    if (buttonText) buttonText.textContent = contextMessages.buttonText;

    // Update button icon based on context
    const buttonIcon = this.elements.copyHours?.querySelector(".button-icon");
    if (buttonIcon) {
      const iconMap = {
        source: "📋", // Copy Hours - Clipboard
        target: "📝", // Paste Hours - Memo/Pencil
        unknown: "📋", // Default - Clipboard
      };
      buttonIcon.textContent = iconMap[currentContext.type] || iconMap.unknown;
    }
  }

  //Update UI state based on extension enabled/disabled
  updateUIState(isEnabled, immediate = false) {
    if (!this.elements.container) return;

    this.elements.container.classList.toggle("collapsed", !isEnabled);
    this.elements.container.classList.toggle("expanded", isEnabled);

    document.body.style.width = isEnabled ? "270px" : "180px";
    if (this.elements.toggleLabel) {
      this.elements.toggleLabel.textContent = this.i18n.getMessage(
        isEnabled ? "extensionEnabled" : "extensionDisabled"
      );
    }

    // Show appropriate status message
    this.showStatus(
      !isEnabled
        ? null
        : this.controller.currentContext.type === "unknown"
        ? [`ℹ️ ${this.i18n.getMessage("guidanceTextDefault")}`, "info"]
        : null
    );
  }

  //Update button availability based on state
  updateButtonAvailability(currentContext, isOperationInProgress) {
    const isEnabled = this.elements.extensionToggle?.checked;
    const isValidContext = currentContext.type !== "unknown";

    this.setButtonState(
      this.elements.autoClickButton,
      !isEnabled ||
        currentContext.primaryAction !== "copy" ||
        isOperationInProgress
    );
    this.setButtonState(
      this.elements.copyHours,
      !isEnabled || !isValidContext || isOperationInProgress
    );

    const clearButton =
      this.elements.analyticsSection?.querySelector("#clearDataButton");
    if (clearButton) {
      clearButton.disabled = isOperationInProgress;
      clearButton.style.opacity = isOperationInProgress ? "0.5" : "1";
    }
  }

  //Set button state (enabled/disabled)
  setButtonState(button, disabled) {
    if (button) {
      button.disabled = disabled;
      button.style.opacity = disabled ? "0.5" : "1";
    }
  }

  //Set button text content
  setButtonText(button, text) {
    const buttonText = button?.querySelector(".button-text");
    if (buttonText) buttonText.textContent = text;
  }

  //Update statistics section visibility
  updateStatisticsVisibility(visible) {
    if (this.elements.analyticsSection) {
      this.elements.analyticsSection.style.display = visible ? "block" : "none";
    }
  }

  //Show status message
  showStatus(message, type = "message") {
    this.StatusManager.showStatus(this.elements.statusDiv, message, type);
  }

  //Show confirmation modal
  showModal() {
    return new Promise((resolve) => {
      this.controller.modalResolve = resolve;
      this.elements.confirmModal?.classList.remove("hidden");
    });
  }

  //Hide confirmation modal
  hideModal() {
    this.elements.confirmModal?.classList.add("hidden");
    if (this.controller.modalResolve) {
      this.controller.modalResolve(false);
      this.controller.modalResolve = null;
    }
  }

  //Confirm modal action
  confirmModal() {
    this.elements.confirmModal?.classList.add("hidden");
    if (this.controller.modalResolve) {
      this.controller.modalResolve(true);
      this.controller.modalResolve = null;
    }
  }

  //Remove no-transition class after initialization
  removeNoTransition() {
    this.elements.container?.classList.remove("no-transition");
  }
}

// Export for popup
window.UIManager = UIManager;
