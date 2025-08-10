import { storage } from '@/shared/common';
import type { SupportedLanguage, I18nMessages, StorageSchema } from '@/types';

type MessageSubstitutions = string[] | [string] | [string, string];

export class I18nManager {
  private currentLanguage: SupportedLanguage = 'en';
  private messages: I18nMessages = {};

  constructor() {}

  async init(): Promise<void> {
    await this.loadCurrentLanguage();
    await this.loadMessages();
    this.setDocumentDirection();
  }

  async loadCurrentLanguage(): Promise<void> {
    try {
      const res = (await storage.get([
        'currentLanguage',
      ])) as Partial<StorageSchema>;
      const currentLanguage = res.currentLanguage as
        | SupportedLanguage
        | undefined;

      if (currentLanguage && ['en', 'he'].includes(currentLanguage)) {
        this.currentLanguage = currentLanguage;
      } else {
        const browserLang = chrome.i18n.getUILanguage();
        const langCode = browserLang.split('-')[0] as SupportedLanguage;
        if (['en', 'he'].includes(langCode)) {
          this.currentLanguage = langCode;
        } else {
          this.currentLanguage = 'en';
        }
        try {
          await storage.set({ currentLanguage: this.currentLanguage });
        } catch (_error) {
          // Intentionally ignore storage errors
        }
      }
    } catch (error) {
      this.currentLanguage = 'en';
    }
  }

  async loadMessages(): Promise<void> {
    try {
      const response = await fetch(
        chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`)
      );
      const messages = (await response.json()) as Record<
        string,
        { message: string }
      >;
      this.messages = Object.fromEntries(
        Object.entries(messages).map(([k, v]) => [k, v.message || k])
      );
    } catch (error) {
      this.messages = {};
    }
  }

  getMessage(key: string, substitutions: MessageSubstitutions = []): string {
    try {
      if (this.messages[key]) {
        let message = this.messages[key];
        if (substitutions.length > 0) {
          substitutions.forEach((sub, index) => {
            message = message.replace(
              new RegExp(`\\$${index + 1}\\$`, 'g'),
              sub
            );
            if (index === 0) {
              ['COUNT', 'CURRENT', 'DATE', 'START', 'SITE', 'INDEX'].forEach(
                p => {
                  message = message.replace(new RegExp(`\\$${p}\\$`, 'g'), sub);
                }
              );
            } else if (index === 1) {
              ['TOTAL', 'END'].forEach(p => {
                message = message.replace(new RegExp(`\\$${p}\\$`, 'g'), sub);
              });
            }
          });
        }
        return message;
      }
      return chrome.i18n.getMessage(key, substitutions) || key;
    } catch (error) {
      return key;
    }
  }

  async switchLanguage(language: SupportedLanguage): Promise<boolean> {
    if (!['en', 'he'].includes(language)) {
      return false;
    }

    this.currentLanguage = language;
    try {
      await storage.set({ currentLanguage: this.currentLanguage });
    } catch (_error) {
      // Intentionally ignore storage errors
    }
    await this.loadMessages();
    this.setDocumentDirection();
    return true;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  isRtl(): boolean {
    return this.currentLanguage === 'he';
  }

  getTextDirection(): 'ltr' | 'rtl' {
    return this.isRtl() ? 'rtl' : 'ltr';
  }

  setDocumentDirection(): void {
    if (typeof document !== 'undefined') {
      const direction = this.getTextDirection();
      document.documentElement.dir = direction;
      document.documentElement.lang = this.currentLanguage;
      document.body.classList.toggle('rtl', this.isRtl());
    }
  }

  getErrorMessages(): {
    extensionDisabled: string;
    wrongSite: string;
    noData: string;
    inProgress: string;
    noTimeBoxes: string;
    copyFailed: string;
    pasteFailed: string;
    invalidAction: string;
  } {
    return {
      extensionDisabled: this.getMessage('errorExtensionDisabled'),
      wrongSite: this.getMessage('errorWrongSite'),
      noData: this.getMessage('errorNoData'),
      inProgress: this.getMessage('errorInProgress'),
      noTimeBoxes: this.getMessage('errorNoTimeBoxes'),
      copyFailed: this.getMessage('errorNoData'),
      pasteFailed: this.getMessage('errorNoData'),
      invalidAction: this.getMessage('errorUnknownAction'),
    };
  }

  getWorkingMessages(): {
    copying: string;
    pasting: string;
    autoClick: string;
    clearing: string;
  } {
    return {
      copying: this.getMessage('workingCopying'),
      pasting: this.getMessage('workingPasting'),
      autoClick: this.getMessage('workingAutoClick'),
      clearing: this.getMessage('workingClearing'),
    };
  }

  formatTimestamp(timestamp: string | null): string {
    if (!timestamp) {
      return this.getMessage('statNever');
    }

    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) {
      return this.getMessage('timeFormatJustNow');
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}${this.getMessage('timeFormatMinutesAgo')}`;
    }
    if (diffHours < 24) {
      return `${diffHours}${this.getMessage('timeFormatHoursAgo')}`;
    }
    if (diffDays < 7) {
      return `${diffDays}${this.getMessage('timeFormatDaysAgo')}`;
    }

    return new Date(timestamp).toLocaleDateString(this.getCurrentLanguage());
  }

  formatCounterValue(
    timestamp: string | null,
    count: number,
    failures: number = 0
  ): string {
    const successText =
      count === 1
        ? this.getMessage('timeFormatSingularTime')
        : this.getMessage('timeFormatPluralTimes');
    const failText =
      failures === 1
        ? this.getMessage('timeFormatSingularFail')
        : this.getMessage('timeFormatPluralFails');

    if (count === 0 && failures === 0) {
      return this.getMessage('statNever');
    }

    if (count > 0 && timestamp) {
      const timeText = this.formatTimestamp(timestamp);
      if (failures > 0) {
        return `${timeText} (${count} ${successText}, ${failures} ${failText})`;
      } else {
        return `${timeText} (${count} ${successText})`;
      }
    }

    if (count === 0 && failures > 0) {
      return `${this.getMessage('statNever')} (${failures} ${failText})`;
    }

    return this.getMessage('statNever');
  }
}

const i18nManager = new I18nManager();

if (typeof window !== 'undefined') {
  window.i18nManager = i18nManager;
}

export { i18nManager };
export default i18nManager;
