class LanguageManager {
  constructor(controller) {
    this.controller = controller;
    this.i18n = controller.i18n;
    this.uiManager = controller.uiManager;
  }

  // Update language dropdown display
  updateLanguageDropdown() {
    const currentLang = this.i18n.getCurrentLanguage();
    document.querySelectorAll(".language-option").forEach((option) => {
      option.classList.toggle(
        "active",
        option.getAttribute("data-lang") === currentLang
      );
    });

    const supportedLanguages = this.i18n.getSupportedLanguages();
    const currentLanguageInfo = supportedLanguages.find(
      (lang) => lang.code === currentLang
    );
    const langName = currentLanguageInfo
      ? currentLanguageInfo.name
      : this.i18n.getMessage("languageEnglish");
    const languageText = document.querySelector(".language-text");
    if (languageText) {
      languageText.textContent = `${this.i18n.getMessage(
        "languageToggle"
      )} (${langName})`;
    }
  }

  //Handle language toggle button click
  handleLanguageToggle(e) {
    e.stopPropagation();
    this.toggleLanguageDropdown();
  }

  //Toggle language dropdown visibility
  toggleLanguageDropdown() {
    const languageDropdown = this.uiManager.elements.languageDropdown;
    const languageToggle = this.uiManager.elements.languageToggle;

    if (!languageDropdown) return;

    const isHidden = languageDropdown.classList.contains("hidden");
    languageDropdown.classList.toggle("hidden", !isHidden);
    languageToggle?.classList.toggle("active", isHidden);
  }

  //Handle document click to hide dropdown
  handleDocumentClick() {
    this.hideLanguageDropdown();
  }

  //Hide language dropdown
  hideLanguageDropdown() {
    const languageDropdown = this.uiManager.elements.languageDropdown;
    const languageToggle = this.uiManager.elements.languageToggle;

    if (!languageDropdown || !languageToggle) return;

    languageDropdown.classList.add("hidden");
    languageToggle.classList.remove("active");
  }

  //Handle language option selection
  handleLanguageOption(e) {
    const language = e.target
      .closest(".language-option")
      ?.getAttribute("data-lang");
    if (language) {
      this.switchLanguage(language);
    }
  }

  //Switch to different language
  async switchLanguage(language) {
    if (!this.i18n.supportedLanguages.includes(language)) return;

    try {
      await this.i18n.switchLanguage(language);
      await this.reloadExtensionUI();
      this.hideLanguageDropdown();
      this.uiManager.showStatus(
        `✅ ${this.i18n.getMessage("successLanguageChanged")}`,
        "success"
      );
    } catch (error) {
      this.uiManager.showStatus(
        `❌ ${this.i18n.getMessage("errorLanguageSwitchFailed")}`,
        "error"
      );
    }
  }

  //Reload extension UI after language change
  async reloadExtensionUI() {
    this.uiManager.updateAllText();
    this.controller.currentContext =
      await this.controller.detectCurrentContext();
    this.uiManager.updateInterface(this.controller.currentContext);
    this.uiManager.updateUIState(
      this.uiManager.elements.extensionToggle?.checked,
      true
    );
    await this.controller.analyticsDisplay.loadAnalytics();
    this.updateLanguageDropdown();
  }
}

// Export for popup
window.LanguageManager = LanguageManager;
