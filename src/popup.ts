import { storage, detectSite, tabs, showStatus } from './lib';
import * as i18n from './i18n';
import { displayResults, loadAnalytics, setText } from './popup-ui';
import type { ContextId, ExtensionMessage, ExtensionResponse, StatusType, UIContext } from './types';
let context: UIContext = { id: 'unknown', name: '', type: 'unknown', primaryAction: 'copy' };
let isOperationInProgress = false;
let modalResolve: ((v: boolean) => void) | null = null;
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector(selector) as T | null;
const $id = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const el = {
  container: $('.container'),
  contextBadge: $('.context-badge'),
  toggleLabel: $('.toggle-label'),
  guidanceText: $('.guidance-text'),
  statusDiv: $id('status'),
  confirmModal: $id('confirmModal'),
  extensionToggle: $id<HTMLInputElement>('extensionToggle'),
  statisticsToggle: $id<HTMLInputElement>('statisticsToggle'),
  autoClickButton: $id<HTMLButtonElement>('autoClickButton'),
  copyHours: $id<HTMLButtonElement>('copyHours'),
  settingsContainer: $('.settings-container'),
  settingsButton: $id('settingsButton'),
  backButton: $id('backButton'),
  themeSelect: $id<HTMLSelectElement>('themeSelect'),
  languageSelect: $id<HTMLSelectElement>('languageSelect'),
  statisticsContent: $id('statisticsContent'),
  clearDataButtonSettings: $id<HTMLButtonElement>('clearDataButtonSettings'),
  calculatorSection: $('.calculator-section'),
  calculatorToggle: $id<HTMLInputElement>('calculatorToggle'),
  hourlyRateInput: $id<HTMLInputElement>('hourlyRateInput'),
  calculateButton: $id<HTMLButtonElement>('calculateButton'),
  rateInputWrapper: $id('rateInputWrapper'),
  rateArrowUp: $<HTMLButtonElement>('.calc-arrow-up'),
  rateArrowDown: $<HTMLButtonElement>('.calc-arrow-down'),
};
const CONTEXTS: Record<
  ContextId,
  { nameKey: string; type: UIContext['type']; primaryAction: UIContext['primaryAction'] }
> = {
  unknown: { nameKey: 'unknownWebsite', type: 'unknown', primaryAction: 'copy' },
  hilanTimesheet: { nameKey: 'contextHilanTimesheet', type: 'source', primaryAction: 'copy' },
  hilan: { nameKey: 'contextHilan', type: 'source', primaryAction: 'copy' },
  malam: { nameKey: 'contextMalam', type: 'target', primaryAction: 'paste' },
};
const ERROR_KEY_BY_CODE: Record<string, string> = {
  EXT_DISABLED: 'errorExtensionDisabled',
  WRONG_SITE: 'errorWrongSite',
  NO_DATA: 'errorNoData',
  OPERATION_IN_PROGRESS: 'errorInProgress',
  NO_TIME_BOXES: 'errorNoTimeBoxes',
  COPY_FAILED: 'errorNoData',
  PASTE_FAILED: 'errorNoData',
  INVALID_ACTION: 'errorUnknownAction',
};
const status = (message: string | [string, StatusType] | null, type?: StatusType) =>
  showStatus(el.statusDiv, message, type);
const toggleHidden = (node: Element | null, visible: boolean) => node?.classList.toggle('hidden', !visible);
const setButtonText = (btn: HTMLButtonElement | null, text: string) =>
  setText(btn?.querySelector('.button-text'), text);
async function init() {
  await i18n.init();
  context = await detectContext();
  setupEventListeners();
  await loadSettings();
  updateAllText();
  el.container?.classList.remove('no-transition');
  updateInterface();
  updateUIState(el.extensionToggle?.checked ?? false, true);
  updateButtonAvailability();
  await loadAnalytics();
}
const getContext = (id: ContextId): UIContext => {
  const { nameKey, type, primaryAction } = CONTEXTS[id];
  return { id, name: i18n.getMessage(nameKey), type, primaryAction };
};
async function detectContext(): Promise<UIContext> {
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (!tab) return getContext('unknown');
    const site = detectSite(tab.url || '');
    const url = (tab.url || '').toLowerCase();
    if (site?.name === 'HILAN') return getContext('hilanTimesheet');
    if (site?.name === 'MALAM') return getContext('malam');
    if (url.includes('hilan.co.il')) return getContext('hilan');
    return getContext('unknown');
  } catch {
    return getContext('unknown');
  }
}
function setupEventListeners() {
  el.extensionToggle?.addEventListener('change', handleExtensionToggle);
  el.statisticsToggle?.addEventListener('change', handleStatisticsToggle);
  el.autoClickButton?.addEventListener('click', handleAutoClick);
  el.copyHours?.addEventListener('click', handlePrimaryOperation);
  el.settingsButton?.addEventListener('click', () => showView('settings'));
  el.backButton?.addEventListener('click', () => showView('main'));
  el.themeSelect?.addEventListener('change', handleThemeChange);
  el.languageSelect?.addEventListener('change', handleLanguageSelect);
  el.clearDataButtonSettings?.addEventListener('click', handleClearData);
  el.calculatorToggle?.addEventListener('change', handleCalculatorToggle);
  el.hourlyRateInput?.addEventListener('input', handleHourlyRateChange);
  el.hourlyRateInput?.addEventListener('keydown', e => e.key === 'Enter' && el.calculateButton?.click());
  el.calculateButton?.addEventListener('click', handleCalculate);
  el.rateInputWrapper?.addEventListener('click', () => el.hourlyRateInput?.focus());
  el.rateArrowUp?.addEventListener('click', () => {
    el.hourlyRateInput?.stepUp();
    handleHourlyRateChange();
  });
  el.rateArrowDown?.addEventListener('click', () => {
    el.hourlyRateInput?.stepDown();
    handleHourlyRateChange();
  });
  document.addEventListener(
    'keydown',
    e => e.key === 'Escape' && !el.confirmModal?.classList.contains('hidden') && handleModal(false)
  );
  $id('modalCancel')?.addEventListener('click', () => handleModal(false));
  $id('modalConfirm')?.addEventListener('click', () => handleModal(true));
  el.confirmModal?.addEventListener('click', e => e.target === el.confirmModal && handleModal(false));
}
async function loadSettings() {
  const settings = await storage.get();
  if (el.extensionToggle) el.extensionToggle.checked = settings.extensionEnabled;
  if (el.statisticsToggle) el.statisticsToggle.checked = settings.statisticsEnabled;
  if (el.themeSelect) el.themeSelect.value = settings.currentTheme;
  if (el.languageSelect) el.languageSelect.value = settings.currentLanguage;
  if (el.calculatorToggle) el.calculatorToggle.checked = settings.calculatorEnabled;
  if (el.hourlyRateInput && settings.hourlyRate > 0) el.hourlyRateInput.value = String(settings.hourlyRate);
  updateUIState(settings.extensionEnabled, true);
  applyTheme(settings.currentTheme);
  toggleHidden(el.statisticsContent, settings.statisticsEnabled);
  toggleHidden(el.calculatorSection, settings.calculatorEnabled);
}
function updateAllText() {
  document.title = i18n.getMessage('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (key) setText(node, i18n.getMessage(key));
  });
}
function updateInterface() {
  if (el.contextBadge) {
    el.contextBadge.textContent = context.name;
    el.contextBadge.className = `context-badge ${context.type}`;
  }
  const guidanceKey =
    context.type === 'source'
      ? 'guidanceTextSource'
      : context.type === 'target'
        ? 'guidanceTextTarget'
        : 'guidanceTextDefault';
  const btnKey = context.type === 'source' ? 'copyHours' : context.type === 'target' ? 'pasteHours' : 'syncHours';
  setText(el.guidanceText, i18n.getMessage(guidanceKey));
  setText(el.copyHours?.querySelector('.button-text'), i18n.getMessage(btnKey));
  setText(el.copyHours?.querySelector('.button-icon'), context.type === 'target' ? '📝' : '📋');
}
function updateUIState(enabled: boolean, immediate = false) {
  if (!el.container) return;
  el.container.classList.toggle('collapsed', !enabled);
  el.container.classList.toggle('expanded', enabled);
  if (immediate) {
    el.container.classList.add('no-transition');
    setTimeout(() => el.container?.classList.remove('no-transition'), 0);
  }
  document.body.classList.toggle('popup-expanded', enabled);
  document.body.classList.toggle('popup-collapsed', !enabled);
  setText(el.toggleLabel, i18n.getMessage(enabled ? 'extensionEnabled' : 'extensionDisabled'));
  const statusMessage: [string, StatusType] | null =
    enabled && context.type === 'unknown' ? [`ℹ️ ${i18n.getMessage('guidanceTextDefault')}`, 'info'] : null;
  status(statusMessage);
}
function updateButtonAvailability() {
  const enabled = el.extensionToggle?.checked ?? false;
  const isHilanTimesheet = context.id === 'hilanTimesheet';
  if (el.autoClickButton) el.autoClickButton.disabled = !enabled || !isHilanTimesheet || isOperationInProgress;
  if (el.copyHours)
    el.copyHours.disabled = !enabled || context.type === 'unknown' || isOperationInProgress || context.id === 'hilan';
  if (el.clearDataButtonSettings) el.clearDataButtonSettings.disabled = isOperationInProgress;
  updateCalculateButtonState();
}
function updateCalculateButtonState() {
  const rate = parseFloat(el.hourlyRateInput?.value || '0');
  const isHilan = context.id === 'hilanTimesheet';
  if (el.calculateButton) el.calculateButton.disabled = !(rate > 0) || !isHilan || isOperationInProgress;
}
async function handleHourlyRateChange() {
  const rate = parseFloat(el.hourlyRateInput?.value || '0');
  if (rate > 0) await storage.set({ hourlyRate: rate });
  updateCalculateButtonState();
}
async function handleExtensionToggle() {
  if (isOperationInProgress) return;
  const enabled = el.extensionToggle?.checked ?? false;
  await storage.set({ extensionEnabled: enabled });
  updateUIState(enabled);
  updateButtonAvailability();
}
async function handleStatisticsToggle() {
  const enabled = el.statisticsToggle?.checked ?? false;
  await storage.set({ statisticsEnabled: enabled });
  toggleHidden(el.statisticsContent, enabled);
}
async function handleCalculatorToggle() {
  const enabled = el.calculatorToggle?.checked ?? false;
  await storage.set({ calculatorEnabled: enabled });
  toggleHidden(el.calculatorSection, enabled);
}
async function handleCalculate() {
  if (isOperationInProgress) return;
  const hourlyRate = parseFloat(el.hourlyRateInput?.value || '0');
  if (hourlyRate <= 0) {
    status(`❌ ${i18n.getMessage('errorEnterHourlyRate')}`, 'error');
    return;
  }
  isOperationInProgress = true;
  updateCalculateButtonState();
  status(`🧮 ${i18n.getMessage('workingCalculating')}`, 'working');
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No tab');
    const response = await tabs.sendMessage<ExtensionResponse>(tab.id, { action: 'calculateSalary', hourlyRate });
    if (response.success && response.calculatorResult) {
      displayResults(response.calculatorResult);
      await storage.set({ hourlyRate });
      status(`✅ ${i18n.getMessage('successCalculated')}`, 'success');
    } else {
      const msg =
        response.error?.code === 'NO_DATA'
          ? i18n.getMessage('errorNoTimesheetData')
          : i18n.getMessage('errorOperationFailed');
      status(`❌ ${msg}`, 'error');
    }
  } catch {
    status(`❌ ${i18n.getMessage('errorOperationFailed')}`, 'error');
  } finally {
    isOperationInProgress = false;
    updateCalculateButtonState();
  }
}
async function handleAutoClick() {
  if (isOperationInProgress || context.primaryAction !== 'copy') return;
  const working = i18n.getMessage('workingAutoClick');
  await performOperation(
    'autoClickTimeBoxes',
    working,
    working,
    i18n.getMessage('autoClickButton'),
    el.autoClickButton
  );
}
async function handlePrimaryOperation() {
  if (isOperationInProgress || context.type === 'unknown') return;
  const isSource = context.primaryAction === 'copy';
  const working = i18n.getMessage(isSource ? 'workingCopying' : 'workingPasting');
  await performOperation(
    'copyHours',
    working,
    working,
    i18n.getMessage(isSource ? 'copyHours' : 'pasteHours'),
    el.copyHours
  );
}
async function handleClearData() {
  if (isOperationInProgress || !(await showModal())) return;
  try {
    status(`🗑️ ${i18n.getMessage('workingClearing')}`, 'working');
    await storage.clear();
    await storage.set({ extensionEnabled: true, statisticsEnabled: true, calculatorEnabled: true });
    [el.extensionToggle, el.statisticsToggle, el.calculatorToggle].forEach(toggle => toggle && (toggle.checked = true));
    if (el.hourlyRateInput) el.hourlyRateInput.value = '';
    document.getElementById('calculatorResults')?.classList.add('hidden');
    toggleHidden(el.calculatorSection, true);
    updateCalculateButtonState();
    await i18n.switchLanguage('system');
    [el.languageSelect, el.themeSelect].forEach(select => select && (select.value = 'system'));
    applyTheme('system');
    updateAllText();
    context = await detectContext();
    updateInterface();
    updateUIState(true);
    toggleHidden(el.statisticsContent, true);
    await loadAnalytics();
    status(`✅ ${i18n.getMessage('successCleared')}`, 'success');
  } catch {
    status(`❌ ${i18n.getMessage('errorClearDataFailed')}`, 'error');
  }
}
async function performOperation(
  action: ExtensionMessage['action'],
  workingText: string,
  statusText: string,
  defaultText: string,
  btn: HTMLButtonElement | null
) {
  isOperationInProgress = true;
  updateButtonAvailability();
  setButtonText(btn, workingText);
  status(statusText, 'working');
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('No active tab');
    const response = await tabs.sendMessage<ExtensionResponse>(tab.id!, { action });
    if (response.success) {
      const count = String(response.count || 0);
      const clicked = String(response.clickedCount || 0);
      const total = String(response.totalBoxes || 0);
      const msg =
        action === 'autoClickTimeBoxes'
          ? i18n.getMessage('successAutoClick', [clicked, total])
          : i18n.getMessage(context.primaryAction === 'copy' ? 'successCopied' : 'successPasted', [count]);
      status(`✅ ${msg}`, 'success');
    } else {
      const key = ERROR_KEY_BY_CODE[response.error?.code ?? ''];
      const msg = key ? i18n.getMessage(key) : response.error?.message || i18n.getMessage('errorOperationFailed');
      status(`❌ ${msg}`, 'error');
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : 'Unknown error';
    if (err.includes('COMMUNICATION_TIMEOUT')) status(`⏱️ ${i18n.getMessage('errorOperationTimedOut')}`, 'error');
    else if (err.includes('Communication failed')) status(`⚠️ ${i18n.getMessage('errorCommunicationIssue')}`, 'error');
    else status(`❌ ${i18n.getMessage('errorOperationFailed')}: ${err}`, 'error');
  } finally {
    setButtonText(btn, defaultText);
    isOperationInProgress = false;
    updateButtonAvailability();
    await loadAnalytics();
  }
}
function showModal(): Promise<boolean> {
  return new Promise(resolve => {
    modalResolve = resolve;
    el.confirmModal?.classList.remove('hidden');
  });
}
function handleModal(confirmed: boolean) {
  el.confirmModal?.classList.add('hidden');
  modalResolve?.(confirmed);
  modalResolve = null;
}
function showView(view: 'main' | 'settings') {
  el.container?.classList.toggle('hidden', view !== 'main');
  el.settingsContainer?.classList.toggle('hidden', view !== 'settings');
  if (view === 'settings') loadAnalytics();
}
function applyTheme(theme: 'system' | 'light' | 'dark') {
  document.documentElement.removeAttribute('data-theme');
  if (theme !== 'system') document.documentElement.setAttribute('data-theme', theme);
}
async function handleThemeChange() {
  const theme = el.themeSelect?.value as 'system' | 'light' | 'dark';
  await storage.set({ currentTheme: theme });
  applyTheme(theme);
}
async function handleLanguageSelect() {
  const lang = el.languageSelect?.value as 'system' | 'en' | 'he';
  await i18n.switchLanguage(lang);
  updateAllText();
  context = await detectContext();
  updateInterface();
  updateUIState(el.extensionToggle?.checked ?? false, true);
  await loadAnalytics();
}
init();
