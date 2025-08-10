import type { StorageSchema, I18nManager, PopupController } from '@/types';

export class AnalyticsDisplay {
  private controller: PopupController;
  private storage: PopupController['storage'];
  private i18n: I18nManager;
  private DEFAULTS: Partial<StorageSchema>;
  private handleClearDataClick: (e: Event) => void;

  constructor(controller: PopupController) {
    this.controller = controller;
    this.storage = controller.storage;
    this.i18n = controller.i18n;
    this.DEFAULTS = controller.DEFAULTS;
    this.handleClearDataClick = () => this.controller.handleClearData();
  }

  private getAnalytics(data: StorageSchema): Record<string, string> {
    return {
      statLastCopied: this.i18n.formatCounterValue(
        data.analytics.operations.copy.lastTime,
        data.analytics.operations.copy.success,
        data.analytics.operations.copy.failures
      ),
      statLastPasted: this.i18n.formatCounterValue(
        data.analytics.operations.paste.lastTime,
        data.analytics.operations.paste.success,
        data.analytics.operations.paste.failures
      ),
      statLastAutoClick: this.i18n.formatCounterValue(
        data.analytics.operations.autoClick.lastTime,
        data.analytics.operations.autoClick.success,
        data.analytics.operations.autoClick.failures
      ),
      statTotalOperations: String(data.analytics.totalOperations),
      statSuccessRate: `${data.analytics.successRate}%`,
    };
  }

  async loadAnalytics(): Promise<void> {
    const data = await this.storage.get(this.DEFAULTS);
    const analyticsSection = document.querySelector('.analytics-section');
    if (!analyticsSection) {
      return;
    }

    const analyticsValues = this.getAnalytics(data);

    for (const [labelKey, value] of Object.entries(analyticsValues)) {
      const labelEl = analyticsSection.querySelector(
        `.stat-label[data-i18n="${labelKey}"]`
      ) as HTMLElement | null;
      const itemEl = labelEl?.closest('.stat-item') as HTMLElement | null;
      const valueEl = itemEl?.querySelector(
        '.stat-value'
      ) as HTMLElement | null;
      if (valueEl) {
        valueEl.textContent = value;
      }
    }

    const clearDataButton = analyticsSection.querySelector(
      '#clearDataButton'
    ) as HTMLButtonElement | null;
    if (clearDataButton) {
      clearDataButton.removeEventListener('click', this.handleClearDataClick);
      clearDataButton.addEventListener('click', this.handleClearDataClick);
    }
  }
}

export default AnalyticsDisplay;
