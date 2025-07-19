class I18nManager {
  constructor() {
    this.currentLanguage = "en";
    this.rtlLanguages = ["he", "ar", "fa", "ur"];
    this.supportedLanguages = ["en", "he"];
    this.messages = {};

    // Use shared storage and constants
    this.storage = window.TimesheetCommon.storage;
    this.STORAGE_KEYS = window.TimesheetCommon.STORAGE_KEYS;

    this.init();
  }

  async init() {
    await this.loadCurrentLanguage();
    await this.loadMessages();
    this.setDocumentDirection();
  }

  //Load the current language from storage or detect from browser
  async loadCurrentLanguage() {
    try {
      const currentLanguage = await this.storage.get(
        this.STORAGE_KEYS.CURRENT_LANGUAGE
      );
      if (
        currentLanguage &&
        this.supportedLanguages.includes(currentLanguage)
      ) {
        this.currentLanguage = currentLanguage;
      } else {
        // Detect browser language
        const browserLang = chrome.i18n.getUILanguage();
        const langCode = browserLang.split("-")[0];
        if (this.supportedLanguages.includes(langCode)) {
          this.currentLanguage = langCode;
        } else {
          this.currentLanguage = "en"; // Default fallback
        }
        await this.saveCurrentLanguage();
      }
    } catch (error) {
      this.currentLanguage = "en";
    }
  }

  //Save the current language to storage
  async saveCurrentLanguage() {
    try {
      await this.storage.set(
        this.STORAGE_KEYS.CURRENT_LANGUAGE,
        this.currentLanguage
      );
    } catch (error) {
      // Silent fail - not critical
    }
  }

  //Load message files for current language
  async loadMessages() {
    try {
      const response = await fetch(
        chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`)
      );
      const messages = await response.json();
      this.messages = {};

      // Extract just the message text from the JSON structure
      for (const [key, value] of Object.entries(messages)) {
        this.messages[key] = value.message || key;
      }
    } catch (error) {
      // Fall back to Chrome's i18n API
      this.messages = {};
    }
  }

  //Get a localized message by key
  getMessage(key, substitutions = []) {
    try {
      // Use our loaded messages first
      if (this.messages[key]) {
        let message = this.messages[key];

        // Handle substitutions manually for our message system
        if (substitutions.length > 0) {
          substitutions.forEach((sub, index) => {
            // Replace numbered placeholders ($1$, $2$, etc.)
            message = message.replace(
              new RegExp(`\\$${index + 1}\\$`, "g"),
              sub
            );

            // Handle common named placeholders based on position
            if (index === 0) {
              message = message.replace(/\$COUNT\$/g, sub);
              message = message.replace(/\$CURRENT\$/g, sub);
              message = message.replace(/\$DATE\$/g, sub);
              message = message.replace(/\$START\$/g, sub);
              message = message.replace(/\$SITE\$/g, sub);
              message = message.replace(/\$INDEX\$/g, sub);
            } else if (index === 1) {
              message = message.replace(/\$TOTAL\$/g, sub);
              message = message.replace(/\$END\$/g, sub);
            }
          });
        }

        return message;
      }

      // Fall back to Chrome's i18n API
      return chrome.i18n.getMessage(key, substitutions) || key;
    } catch (error) {
      return key;
    }
  }

  //Switch to a different language
  async switchLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      return false;
    }

    this.currentLanguage = language;
    await this.saveCurrentLanguage();

    // Reload messages for the new language
    await this.loadMessages();

    // Update document direction
    this.setDocumentDirection();

    return true;
  }

  //Get the current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  //Check if current language is RTL
  isRtl() {
    return this.rtlLanguages.includes(this.currentLanguage);
  }

  //Get text direction for current language
  getTextDirection() {
    return this.isRtl() ? "rtl" : "ltr";
  }

  //Set document direction based on current language (popup only)
  setDocumentDirection() {
    // Only apply RTL to popup context, NEVER to content scripts or website pages
    // Check for popup-specific indicators and that we're in extension context
    if (
      typeof document !== "undefined" &&
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.getURL &&
      document.querySelector(".container") &&
      document.querySelector("#extensionToggle") &&
      (location.href.includes(chrome.runtime.getURL("")) ||
        location.protocol === "chrome-extension:")
    ) {
      const direction = this.getTextDirection();
      document.documentElement.dir = direction;
      document.documentElement.lang = this.currentLanguage;

      // Add/remove RTL class to body for CSS targeting (popup only)
      document.body.classList.toggle("rtl", this.isRtl());
      document.body.classList.toggle("ltr", !this.isRtl());
    }
  }

  //Format a success message with count
  formatSuccessMessage(key, count, total = null) {
    if (total !== null) {
      return this.getMessage(key, [count.toString(), total.toString()]);
    }
    return this.getMessage(key, [count.toString()]);
  }

  //Get all supported languages with their names
  getSupportedLanguages() {
    return [
      {
        code: "en",
        name: this.getMessage("languageEnglish"),
        native: "English",
      },
      { code: "he", name: this.getMessage("languageHebrew"), native: "עברית" },
    ];
  }

  //Get all error messages
  getErrorMessages() {
    return {
      extensionDisabled: this.getMessage("errorExtensionDisabled"),
      wrongSite: this.getMessage("errorWrongSite"),
      noData: this.getMessage("errorNoData"),
      inProgress: this.getMessage("errorInProgress"),
      noTimeBoxes: this.getMessage("errorNoTimeBoxes"),
      copyFailed: this.getMessage("errorNoData"),
      pasteFailed: this.getMessage("errorNoData"),
      invalidAction: this.getMessage("errorUnknownAction"),
    };
  }

  //Get all working messages
  getWorkingMessages() {
    return {
      copying: this.getMessage("workingCopying"),
      pasting: this.getMessage("workingPasting"),
      autoClick: this.getMessage("workingAutoClick"),
      clearing: this.getMessage("workingClearing"),
    };
  }

  //Format a timestamp using localized time format
  formatTimestamp(timestamp) {
    if (!timestamp) return this.getMessage("statNever");

    const TIMING = window.TimesheetCommon.TIMING;
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMinutes = Math.floor(diffMs / TIMING.MILLISECONDS_PER_MINUTE);
    const diffHours = Math.floor(diffMs / TIMING.MILLISECONDS_PER_HOUR);
    const diffDays = Math.floor(diffMs / TIMING.MILLISECONDS_PER_DAY);

    if (diffMinutes < TIMING.TIME_THRESHOLD_JUST_NOW)
      return this.getMessage("timeFormatJustNow");
    if (diffMinutes < TIMING.TIME_THRESHOLD_MINUTES_TO_HOURS)
      return `${diffMinutes}${this.getMessage("timeFormatMinutesAgo")}`;
    if (diffHours < TIMING.TIME_THRESHOLD_HOURS_TO_DAYS)
      return `${diffHours}${this.getMessage("timeFormatHoursAgo")}`;
    if (diffDays < TIMING.TIME_THRESHOLD_DAYS_TO_WEEKS)
      return `${diffDays}${this.getMessage("timeFormatDaysAgo")}`;

    return new Date(timestamp).toLocaleDateString(this.getCurrentLanguage());
  }

  //Format counter text with proper plural/singular forms
  formatCounterText(count, type) {
    if (count === 1) {
      return type === "time"
        ? this.getMessage("timeFormatSingularTime")
        : this.getMessage("timeFormatSingularFail");
    } else {
      return type === "time"
        ? this.getMessage("timeFormatPluralTimes")
        : this.getMessage("timeFormatPluralFails");
    }
  }

  //Format counter display with localized text and failures
  formatCounterValue(timestamp, count, failures = 0) {
    const successText = this.formatCounterText(count, "time");
    const failText = this.formatCounterText(failures, "fail");

    // If there are no successes and no failures, show "Never"
    if (count === 0 && failures === 0) {
      return this.getMessage("statNever");
    }

    // If there are successes, show timestamp with both counts
    if (count > 0 && timestamp) {
      const timeText = this.formatTimestamp(timestamp);
      if (failures > 0) {
        return `${timeText} (${count} ${successText}, ${failures} ${failText})`;
      } else {
        return `${timeText} (${count} ${successText})`;
      }
    }

    // If there are only failures (no successes), show failures only
    if (count === 0 && failures > 0) {
      return `${this.getMessage("statNever")} (${failures} ${failText})`;
    }

    // Fallback - should not normally reach here
    return this.getMessage("statNever");
  }
}

// Create global instance
const i18nManager = new I18nManager();

// Export for use in other files
if (typeof window !== "undefined") {
  window.i18nManager = i18nManager;
}

// For Node.js/module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = i18nManager;
}
