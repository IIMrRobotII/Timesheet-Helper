import { StatusManager, type StatusType } from '@/shared/status-manager';
import type {
  UIContext,
  I18nManager,
  PopupController,
  UIManager as UIManagerInterface,
  SupportedLanguage,
} from '@/types';

const UI_ELEMENTS = {
  container: '.container',
  contextBadge: '.context-badge',
  toggleLabel: '.toggle-label',
  guidanceText: '.guidance-text',
  statusDiv: '#status',
  analyticsSection: '.analytics-section',
  confirmModal: '#confirmModal',
  extensionToggle: '#extensionToggle',
  statisticsToggle: '#statisticsToggle',
  autoClickButton: '#autoClickButton',
  copyHours: '#copyHours',
  languageToggle: '#languageToggle',
  languageDropdown: '#languageDropdown',
} as const;

export class UIManager {
  private controller: PopupController;
  private i18n: I18nManager;
  public elements: UIManagerInterface['elements'] = {};

  constructor(controller: PopupController) {
    this.controller = controller;
    this.i18n = controller.i18n;
  }

  cacheElements(): void {
    this.elements = Object.fromEntries(
      Object.entries(UI_ELEMENTS).map(([key, selector]) => [
        key,
        (document.querySelector(selector) as HTMLElement | null) || undefined,
      ])
    ) as UIManagerInterface['elements'];
  }

  setupEventListeners(): void {
    this.elements.extensionToggle?.addEventListener('change', e =>
      this.controller.handleExtensionToggle?.(e)
    );
    this.elements.statisticsToggle?.addEventListener('change', e =>
      this.controller.handleStatisticsToggle?.(e)
    );
    this.elements.autoClickButton?.addEventListener('click', e =>
      this.controller.handleAutoClickOperation?.(e)
    );
    this.elements.copyHours?.addEventListener('click', e =>
      this.controller.handlePrimaryOperation?.(e)
    );

    this.elements.languageToggle?.addEventListener('click', e => {
      this.handleLanguageToggle(e);
    });
    document.addEventListener('click', () => {
      this.handleDocumentClick();
    });
    document.addEventListener('keydown', e => {
      this.controller.handleEscapeKey?.(e as KeyboardEvent);
    });
    document.querySelectorAll('.language-option').forEach(el => {
      el.addEventListener('click', e => this.handleLanguageOption(e));
    });

    document
      .querySelector('#modalCancel')
      ?.addEventListener('click', e => this.controller.handleModalCancel?.(e));
    document
      .querySelector('#modalConfirm')
      ?.addEventListener('click', e => this.controller.handleModalConfirm?.(e));
    this.elements.confirmModal?.addEventListener('click', e =>
      this.controller.handleModalBackdrop?.(e)
    );
  }

  updateAllText(): void {
    document.title = this.i18n.getMessage('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = this.i18n.getMessage(key);
      }
    });
  }

  updateInterface(currentContext: UIContext): void {
    if (this.elements.contextBadge) {
      this.elements.contextBadge.textContent = currentContext.name;
      this.elements.contextBadge.className = `context-badge ${currentContext.type}`;
    }

    const guidanceKey =
      currentContext.type === 'source'
        ? 'guidanceTextSource'
        : currentContext.type === 'target'
          ? 'guidanceTextTarget'
          : 'guidanceTextDefault';
    const buttonTextKey =
      currentContext.type === 'source'
        ? 'copyHours'
        : currentContext.type === 'target'
          ? 'pasteHours'
          : 'syncHours';

    if (this.elements.guidanceText) {
      this.elements.guidanceText.textContent =
        this.i18n.getMessage(guidanceKey);
    }

    if (this.elements.copyHours) {
      const buttonText = this.elements.copyHours.querySelector(
        '.button-text'
      ) as HTMLElement | null;
      if (buttonText) {
        buttonText.textContent = this.i18n.getMessage(buttonTextKey);
      }
      const buttonIcon = this.elements.copyHours.querySelector(
        '.button-icon'
      ) as HTMLElement | null;
      if (buttonIcon) {
        const iconMap: Record<string, string> = {
          source: '📋',
          target: '📝',
          unknown: '📋',
        };
        buttonIcon.textContent =
          iconMap[currentContext.type] ?? iconMap['unknown'] ?? '📋';
      }
    }
  }

  updateUIState(isEnabled: boolean, immediate: boolean = false): void {
    if (!this.elements.container) {
      return;
    }

    this.elements.container.classList.toggle('collapsed', !isEnabled);
    this.elements.container.classList.toggle('expanded', isEnabled);

    if (immediate) {
      this.elements.container.classList.add('no-transition');
      setTimeout(() => {
        this.elements.container?.classList.remove('no-transition');
      }, 0);
    }

    document.body.classList.toggle('popup-expanded', isEnabled);
    document.body.classList.toggle('popup-collapsed', !isEnabled);
    if (this.elements.toggleLabel) {
      const labelText = this.i18n.getMessage(
        isEnabled ? 'extensionEnabled' : 'extensionDisabled'
      );
      this.elements.toggleLabel.textContent = labelText;
    }

    this.showStatus(
      !isEnabled
        ? null
        : this.controller.currentContext.type === 'unknown'
          ? [
              `ℹ️ ${this.i18n.getMessage('guidanceTextDefault')}`,
              'info' as StatusType,
            ]
          : null
    );
  }

  updateButtonAvailability(
    currentContext: UIContext,
    isOperationInProgress: boolean
  ): void {
    const isEnabled = this.elements.extensionToggle?.checked ?? false;
    const isValidContext = currentContext.type !== 'unknown';
    const isHilanTimesheet =
      currentContext.type === 'source' &&
      currentContext.name === this.i18n.getMessage('contextHilanTimesheet');
    const isHilanHome =
      currentContext.type === 'source' &&
      currentContext.name === this.i18n.getMessage('contextHilan');

    if (this.elements.autoClickButton) {
      const disabled =
        !isEnabled || !isHilanTimesheet || isOperationInProgress || isHilanHome;
      this.elements.autoClickButton.disabled = disabled;
    }

    if (this.elements.copyHours) {
      const disabled =
        !isEnabled || !isValidContext || isOperationInProgress || isHilanHome;
      this.elements.copyHours.disabled = disabled;
    }

    const clearButton = this.elements.analyticsSection?.querySelector(
      '#clearDataButton'
    ) as HTMLButtonElement | null;
    if (clearButton) {
      clearButton.disabled = isOperationInProgress;
    }
  }

  updateStatisticsVisibility(visible: boolean): void {
    this.elements.analyticsSection?.classList.toggle('hidden', !visible);
  }

  showStatus(
    message: string | [string, StatusType] | null,
    type: StatusType = 'message'
  ): void {
    StatusManager.showStatus(this.elements.statusDiv || null, message, type);
  }

  showModal(): Promise<boolean> {
    return new Promise(resolve => {
      this.controller.modalResolve = resolve;
      this.elements.confirmModal?.classList.remove('hidden');
    });
  }

  handleModal(confirmed: boolean): void {
    this.elements.confirmModal?.classList.add('hidden');
    if (this.controller.modalResolve) {
      this.controller.modalResolve(confirmed);
      this.controller.modalResolve = null;
    }
  }

  updateLanguageDropdown(): void {
    const currentLang = this.i18n.getCurrentLanguage();

    document.querySelectorAll('.language-option').forEach(option => {
      option.classList.toggle(
        'active',
        option.getAttribute('data-lang') === currentLang
      );
    });

    const langName =
      currentLang === 'he'
        ? this.i18n.getMessage('languageHebrew')
        : this.i18n.getMessage('languageEnglish');

    const languageText = document.querySelector('.language-text');
    if (languageText) {
      languageText.textContent = `${this.i18n.getMessage('languageToggle')} (${langName})`;
    }
  }

  handleLanguageToggle(e: Event): void {
    e.stopPropagation();
    const languageDropdown = this.elements.languageDropdown;
    const languageToggle = this.elements.languageToggle;

    if (!languageDropdown) {
      return;
    }

    const isHidden = languageDropdown.classList.contains('hidden');
    languageDropdown.classList.toggle('hidden', !isHidden);
    languageToggle?.classList.toggle('active', isHidden);
  }

  handleDocumentClick(): void {
    const languageDropdown = this.elements.languageDropdown;
    const languageToggle = this.elements.languageToggle;

    if (!languageDropdown || !languageToggle) {
      return;
    }

    languageDropdown.classList.add('hidden');
    languageToggle.classList.remove('active');
  }

  handleLanguageOption(e: Event): void {
    const target = e.target as HTMLElement;
    const language = target
      .closest('.language-option')
      ?.getAttribute('data-lang') as SupportedLanguage | null;
    if (language) {
      this.switchLanguage(language);
    }
  }

  async switchLanguage(language: SupportedLanguage): Promise<void> {
    if (!['en', 'he'].includes(language)) {
      return;
    }

    try {
      await this.i18n.switchLanguage(language);
      await this.reloadExtensionUI();
      const languageDropdown = this.elements.languageDropdown;
      const languageToggle = this.elements.languageToggle;
      if (languageDropdown && languageToggle) {
        languageDropdown.classList.add('hidden');
        languageToggle.classList.remove('active');
      }
      this.showStatus(
        `✅ ${this.i18n.getMessage('successLanguageChanged')}`,
        'success'
      );
    } catch (error) {
      console.error('Error switching language:', error);
      this.showStatus(
        `❌ ${this.i18n.getMessage('errorLanguageSwitchFailed')}`,
        'error'
      );
    }
  }

  async reloadExtensionUI(): Promise<void> {
    this.updateAllText();
    this.controller.currentContext =
      await this.controller.detectCurrentContext();
    this.updateInterface(this.controller.currentContext);
    this.updateUIState(this.elements.extensionToggle?.checked ?? false, true);
    await this.controller.analyticsDisplay.loadAnalytics();
    this.updateLanguageDropdown();
  }
}

export default UIManager;
