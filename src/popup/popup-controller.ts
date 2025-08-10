import { storage, DEFAULT_SETTINGS, utils } from '@/shared/common';
import UIManager from './ui-manager';
import AnalyticsDisplay from './analytics-display';
import { i18nManager } from '@/i18n';
import type {
  UIContext,
  I18nManager,
  PopupController as PopupControllerInterface,
  ExtensionMessage,
  ExtensionResponse,
} from '@/types';
import { StatusManager } from '@/shared/status-manager';

const { detectSite, tabs } = utils;

const DEFAULTS = DEFAULT_SETTINGS;

export class PopupController {
  public currentContext: UIContext = {
    name: '',
    type: 'unknown',
    primaryAction: 'copy',
  };
  public isOperationInProgress: boolean = false;
  public modalResolve: ((value: boolean) => void) | null = null;
  public i18n!: I18nManager;
  public storage = storage;
  public DEFAULTS: typeof DEFAULTS;
  public uiManager!: UIManager;
  public analyticsDisplay!: AnalyticsDisplay;

  constructor() {
    this.DEFAULTS = DEFAULTS;

    this.init();
  }

  async init(): Promise<void> {
    this.i18n = i18nManager as I18nManager;
    await this.i18n.init();
    (
      window as Window &
        typeof globalThis & { popupController: PopupController }
    ).popupController = this;

    this.currentContext = await this.detectCurrentContext();

    this.uiManager = new UIManager(this as PopupControllerInterface);
    this.analyticsDisplay = new AnalyticsDisplay(
      this as PopupControllerInterface
    );

    this.uiManager.cacheElements();
    this.uiManager.setupEventListeners();
    await this.loadAndApplySettings();

    this.uiManager.updateAllText();
    this.uiManager.updateLanguageDropdown();
    this.uiManager.elements.container?.classList.remove('no-transition');
    this.uiManager.updateInterface(this.currentContext);
    this.uiManager.updateUIState(
      this.uiManager.elements.extensionToggle?.checked ?? false,
      true
    );
    this.uiManager.updateButtonAvailability(this.currentContext, false);
    await this.analyticsDisplay.loadAnalytics();
  }

  async detectCurrentContext(): Promise<UIContext> {
    try {
      const [tab] = await tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        return {
          name: this.i18n.getMessage('unknownWebsite'),
          type: 'unknown',
          primaryAction: 'copy',
        };
      }

      const site = detectSite(tab.url || '');
      const url = (tab.url || '').toLowerCase();

      if (site?.name === 'HILAN') {
        return {
          name: this.i18n.getMessage('contextHilanTimesheet'),
          type: 'source',
          primaryAction: 'copy',
        };
      }

      if (site?.name === 'MALAM') {
        return {
          name: this.i18n.getMessage('contextMalam'),
          type: 'target',
          primaryAction: 'paste',
        };
      }

      if (url.includes('hilan.co.il')) {
        return {
          name: this.i18n.getMessage('contextHilan'),
          type: 'source',
          primaryAction: 'copy',
        };
      }
      return {
        name: this.i18n.getMessage('unknownWebsite'),
        type: 'unknown',
        primaryAction: 'copy',
      };
    } catch {
      return {
        name: this.i18n.getMessage('unknownWebsite'),
        type: 'unknown',
        primaryAction: 'copy',
      };
    }
  }

  async loadAndApplySettings(): Promise<void> {
    const settings = await storage.get();

    if (this.uiManager.elements.extensionToggle) {
      this.uiManager.elements.extensionToggle.checked =
        settings.extensionEnabled;
    }
    if (this.uiManager.elements.statisticsToggle) {
      this.uiManager.elements.statisticsToggle.checked =
        settings.statisticsEnabled;
    }
    this.uiManager.updateUIState(settings.extensionEnabled, true);
    this.uiManager.updateStatisticsVisibility(settings.statisticsEnabled);
    if (this.currentContext) {
      this.uiManager.updateButtonAvailability(this.currentContext, false);
    }
  }

  async handleExtensionToggle(): Promise<void> {
    if (this.isOperationInProgress) {
      return;
    }
    const isEnabled = this.uiManager.elements.extensionToggle?.checked ?? false;

    await this.storage.set({ extensionEnabled: isEnabled });

    this.uiManager.updateUIState(isEnabled);

    this.uiManager.updateButtonAvailability(
      this.currentContext!,
      this.isOperationInProgress
    );
  }

  async handleStatisticsToggle(): Promise<void> {
    const isEnabled =
      this.uiManager.elements.statisticsToggle?.checked ?? false;
    await this.storage.set({ statisticsEnabled: isEnabled });
    this.uiManager.updateStatisticsVisibility(isEnabled);
  }

  async handleAutoClickOperation(): Promise<void> {
    if (this.isOperationInProgress) {
      return;
    }
    const workingMessages = this.i18n.getWorkingMessages();

    if (this.currentContext.primaryAction === 'copy') {
      await this.performOperation(
        'autoClickTimeBoxes',
        this.i18n.getMessage('workingAutoClick'),
        workingMessages.autoClick,
        this.i18n.getMessage('autoClickButton'),
        this.uiManager.elements.autoClickButton
      );
    }
  }

  async handlePrimaryOperation(): Promise<void> {
    if (this.isOperationInProgress) {
      return;
    }
    const workingMessages = this.i18n.getWorkingMessages();

    if (this.currentContext.type !== 'unknown') {
      const isSource = this.currentContext.primaryAction === 'copy';
      await this.performOperation(
        'copyHours',
        this.i18n.getMessage(isSource ? 'workingCopying' : 'workingPasting'),
        isSource ? workingMessages.copying : workingMessages.pasting,
        this.i18n.getMessage(isSource ? 'copyHours' : 'pasteHours'),
        this.uiManager.elements.copyHours
      );
    }
  }

  async handleClearData(): Promise<void> {
    if (this.isOperationInProgress || !(await this.uiManager.showModal())) {
      return;
    }

    try {
      this.uiManager.showStatus(
        `🗑️ ${this.i18n.getMessage('workingClearing')}`,
        'working'
      );

      await this.storage.clear();

      const defaults = {
        extensionEnabled: true,
        statisticsEnabled: true,
      };
      await this.storage.set(defaults);

      if (this.uiManager.elements.extensionToggle) {
        this.uiManager.elements.extensionToggle.checked = true;
      }
      if (this.uiManager.elements.statisticsToggle) {
        this.uiManager.elements.statisticsToggle.checked = true;
      }
      this.uiManager.updateUIState(true);
      this.uiManager.updateStatisticsVisibility(true);

      await this.analyticsDisplay.loadAnalytics();
      this.uiManager.showStatus(
        `✅ ${this.i18n.getMessage('successCleared')}`,
        'success'
      );
    } catch (error) {
      this.uiManager.showStatus(
        `❌ ${this.i18n.getMessage('errorClearDataFailed')}`,
        'error'
      );
    }
  }

  async performOperation(
    action: ExtensionMessage['action'],
    workingText: string,
    statusText: string,
    defaultText: string,
    button: HTMLButtonElement | undefined
  ): Promise<void> {
    this.setOperationInProgress(true);
    if (button) {
      this.setButtonText(button, workingText);
    }
    this.uiManager.showStatus(statusText, 'working');

    try {
      const response = await this.sendMessage({ action });
      if (response.success) {
        const message = StatusManager.formatSuccessMessage(
          action,
          response,
          this.currentContext,
          this.i18n
        );
        this.uiManager.showStatus(`✅ ${message}`, 'success');
      } else {
        this.uiManager.showStatus(
          `❌ ${StatusManager.getErrorMessage(response, this.i18n)}`,
          'error'
        );
      }
      await this.analyticsDisplay.loadAnalytics();
    } catch (error) {
      const errorMessage = StatusManager.getErrorMessage(
        error instanceof Error ? error : new Error('Unknown error'),
        this.i18n
      );
      this.uiManager.showStatus(errorMessage, 'error');

      if (
        error instanceof Error &&
        error.message.includes('Communication failed')
      ) {
        setTimeout(() => this.analyticsDisplay.loadAnalytics(), 1000);
      }
      await this.analyticsDisplay.loadAnalytics();
    } finally {
      if (button) {
        this.setButtonText(button, defaultText);
      }
      this.setOperationInProgress(false);
    }
  }

  async sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
    try {
      const [tab] = await tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) {
        throw StatusManager.createError('No active tab found');
      }
      return await tabs.sendMessage(tab.id!, message);
    } catch (error) {
      console.error('Message sending failed:', error);
      throw error;
    }
  }

  setOperationInProgress(inProgress: boolean): void {
    this.isOperationInProgress = inProgress;
    this.uiManager.updateButtonAvailability(this.currentContext, inProgress);
  }

  setButtonText(button: HTMLButtonElement | undefined, text: string): void {
    const buttonText = button?.querySelector('.button-text');
    if (buttonText) {
      (buttonText as HTMLElement).textContent = text;
    }
  }

  handleModalCancel(): void {
    this.uiManager.handleModal(false);
  }

  handleModalConfirm(): void {
    this.uiManager.handleModal(true);
  }

  handleModalBackdrop(e: Event): void {
    if (e.target === this.uiManager.elements.confirmModal) {
      this.uiManager.handleModal(false);
    }
  }

  handleEscapeKey(e: KeyboardEvent): void {
    if (
      e.key === 'Escape' &&
      !this.uiManager.elements.confirmModal?.classList.contains('hidden')
    ) {
      this.uiManager.handleModal(false);
    }
  }
}

new PopupController();
