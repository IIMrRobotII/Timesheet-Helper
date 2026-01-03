import { storage, detectSite, tabs, showStatus } from './lib';
import * as i18n from './i18n';
import type { UIContext, ExtensionMessage, ExtensionResponse, StatusType } from './types';

// State
let context: UIContext = { name: '', type: 'unknown', primaryAction: 'copy' };
let isOperationInProgress = false;
let modalResolve: ((v: boolean) => void) | null = null;

// Cached DOM elements
const $ = (s: string) => document.querySelector(s) as HTMLElement | null;
const el = {
  container: $('.container'),
  contextBadge: $('.context-badge'),
  toggleLabel: $('.toggle-label'),
  guidanceText: $('.guidance-text'),
  statusDiv: $('#status'),
  analyticsSection: $('.analytics-section'),
  confirmModal: $('#confirmModal'),
  extensionToggle: $('#extensionToggle') as HTMLInputElement | null,
  statisticsToggle: $('#statisticsToggle') as HTMLInputElement | null,
  autoClickButton: $('#autoClickButton') as HTMLButtonElement | null,
  copyHours: $('#copyHours') as HTMLButtonElement | null,
  languageToggle: $('#languageToggle'),
  languageDropdown: $('#languageDropdown'),
};

// Initialize
async function init() {
  await i18n.init();
  context = await detectContext();
  setupEventListeners();
  await loadSettings();
  updateAllText();
  updateLanguageDropdown();
  el.container?.classList.remove('no-transition');
  updateInterface();
  updateUIState(el.extensionToggle?.checked ?? false, true);
  updateButtonAvailability();
  await loadAnalytics();
}

async function detectContext(): Promise<UIContext> {
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (!tab)
      return {
        name: i18n.getMessage('unknownWebsite'),
        type: 'unknown',
        primaryAction: 'copy',
      };
    const site = detectSite(tab.url || '');
    const url = (tab.url || '').toLowerCase();
    if (site?.name === 'HILAN')
      return {
        name: i18n.getMessage('contextHilanTimesheet'),
        type: 'source',
        primaryAction: 'copy',
      };
    if (site?.name === 'MALAM')
      return {
        name: i18n.getMessage('contextMalam'),
        type: 'target',
        primaryAction: 'paste',
      };
    if (url.includes('hilan.co.il'))
      return {
        name: i18n.getMessage('contextHilan'),
        type: 'source',
        primaryAction: 'copy',
      };
    return {
      name: i18n.getMessage('unknownWebsite'),
      type: 'unknown',
      primaryAction: 'copy',
    };
  } catch {
    return {
      name: i18n.getMessage('unknownWebsite'),
      type: 'unknown',
      primaryAction: 'copy',
    };
  }
}

function setupEventListeners() {
  el.extensionToggle?.addEventListener('change', handleExtensionToggle);
  el.statisticsToggle?.addEventListener('change', handleStatisticsToggle);
  el.autoClickButton?.addEventListener('click', handleAutoClick);
  el.copyHours?.addEventListener('click', handlePrimaryOperation);
  el.languageToggle?.addEventListener('click', e => {
    e.stopPropagation();
    toggleDropdown();
  });
  document.addEventListener('click', () => closeDropdown());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el.confirmModal?.classList.contains('hidden')) handleModal(false);
  });
  document
    .querySelectorAll('.language-option')
    .forEach(opt => opt.addEventListener('click', e => handleLanguageOption(e)));
  $('#modalCancel')?.addEventListener('click', () => handleModal(false));
  $('#modalConfirm')?.addEventListener('click', () => handleModal(true));
  el.confirmModal?.addEventListener('click', e => {
    if (e.target === el.confirmModal) handleModal(false);
  });
  el.analyticsSection?.querySelector('#clearDataButton')?.addEventListener('click', handleClearData);
}

async function loadSettings() {
  const settings = await storage.get();
  if (el.extensionToggle) el.extensionToggle.checked = settings.extensionEnabled;
  if (el.statisticsToggle) el.statisticsToggle.checked = settings.statisticsEnabled;
  updateUIState(settings.extensionEnabled, true);
  updateStatisticsVisibility(settings.statisticsEnabled);
}

function updateAllText() {
  document.title = i18n.getMessage('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(e => {
    const key = e.getAttribute('data-i18n');
    if (key) e.textContent = i18n.getMessage(key);
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
  if (el.guidanceText) el.guidanceText.textContent = i18n.getMessage(guidanceKey);
  if (el.copyHours) {
    const txt = el.copyHours.querySelector('.button-text');
    if (txt) txt.textContent = i18n.getMessage(btnKey);
    const icon = el.copyHours.querySelector('.button-icon');
    if (icon) icon.textContent = context.type === 'target' ? '📝' : '📋';
  }
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
  if (el.toggleLabel) el.toggleLabel.textContent = i18n.getMessage(enabled ? 'extensionEnabled' : 'extensionDisabled');
  showStatus(
    el.statusDiv,
    !enabled
      ? null
      : context.type === 'unknown'
        ? [`ℹ️ ${i18n.getMessage('guidanceTextDefault')}`, 'info' as StatusType]
        : null
  );
}

function updateButtonAvailability() {
  const enabled = el.extensionToggle?.checked ?? false;
  const isHilanTimesheet = context.type === 'source' && context.name === i18n.getMessage('contextHilanTimesheet');
  const isHilanHome = context.type === 'source' && context.name === i18n.getMessage('contextHilan');
  if (el.autoClickButton)
    el.autoClickButton.disabled = !enabled || !isHilanTimesheet || isOperationInProgress || isHilanHome;
  if (el.copyHours)
    el.copyHours.disabled = !enabled || context.type === 'unknown' || isOperationInProgress || isHilanHome;
  const clearBtn = el.analyticsSection?.querySelector('#clearDataButton') as HTMLButtonElement | null;
  if (clearBtn) clearBtn.disabled = isOperationInProgress;
}

function updateStatisticsVisibility(visible: boolean) {
  el.analyticsSection?.classList.toggle('hidden', !visible);
}

// Event handlers
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
  updateStatisticsVisibility(enabled);
}

async function handleAutoClick() {
  if (isOperationInProgress || context.primaryAction !== 'copy') return;
  await performOperation(
    'autoClickTimeBoxes',
    i18n.getMessage('workingAutoClick'),
    i18n.getWorkingMessages().autoClick,
    i18n.getMessage('autoClickButton'),
    el.autoClickButton
  );
}

async function handlePrimaryOperation() {
  if (isOperationInProgress || context.type === 'unknown') return;
  const isSource = context.primaryAction === 'copy';
  await performOperation(
    'copyHours',
    i18n.getMessage(isSource ? 'workingCopying' : 'workingPasting'),
    isSource ? i18n.getWorkingMessages().copying : i18n.getWorkingMessages().pasting,
    i18n.getMessage(isSource ? 'copyHours' : 'pasteHours'),
    el.copyHours
  );
}

async function handleClearData() {
  if (isOperationInProgress || !(await showModal())) return;
  try {
    showStatus(el.statusDiv, `🗑️ ${i18n.getMessage('workingClearing')}`, 'working');
    await storage.clear();
    await storage.set({ extensionEnabled: true, statisticsEnabled: true });
    if (el.extensionToggle) el.extensionToggle.checked = true;
    if (el.statisticsToggle) el.statisticsToggle.checked = true;
    updateUIState(true);
    updateStatisticsVisibility(true);
    await loadAnalytics();
    showStatus(el.statusDiv, `✅ ${i18n.getMessage('successCleared')}`, 'success');
  } catch {
    showStatus(el.statusDiv, `❌ ${i18n.getMessage('errorClearDataFailed')}`, 'error');
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
  showStatus(el.statusDiv, statusText, 'working');
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('No active tab');
    const response = await tabs.sendMessage<ExtensionResponse>(tab.id!, {
      action,
    });
    if (response.success) {
      const msg =
        action === 'autoClickTimeBoxes'
          ? i18n.getMessage('successAutoClick', [
              (response.clickedCount || 0).toString(),
              (response.totalBoxes || 0).toString(),
            ])
          : i18n.getMessage(context.primaryAction === 'copy' ? 'successCopied' : 'successPasted', [
              (response.count || 0).toString(),
            ]);
      showStatus(el.statusDiv, `✅ ${msg}`, 'success');
    } else {
      const errMsgs = i18n.getErrorMessages();
      const errMap: Record<string, string> = {
        EXT_DISABLED: errMsgs.extensionDisabled,
        WRONG_SITE: errMsgs.wrongSite,
        NO_DATA: errMsgs.noData,
        OPERATION_IN_PROGRESS: errMsgs.inProgress,
        NO_TIME_BOXES: errMsgs.noTimeBoxes,
        COPY_FAILED: errMsgs.copyFailed,
        PASTE_FAILED: errMsgs.pasteFailed,
        INVALID_ACTION: errMsgs.invalidAction,
      };
      showStatus(
        el.statusDiv,
        `❌ ${errMap[response.error?.code ?? ''] || response.error?.message || i18n.getMessage('errorOperationFailed')}`,
        'error'
      );
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : 'Unknown error';
    if (err.includes('COMMUNICATION_TIMEOUT'))
      showStatus(el.statusDiv, `⏱️ ${i18n.getMessage('errorOperationTimedOut')}`, 'error');
    else if (err.includes('Communication failed'))
      showStatus(el.statusDiv, `⚠️ ${i18n.getMessage('errorCommunicationIssue')}`, 'error');
    else showStatus(el.statusDiv, `❌ ${i18n.getMessage('errorOperationFailed')}: ${err}`, 'error');
  } finally {
    setButtonText(btn, defaultText);
    isOperationInProgress = false;
    updateButtonAvailability();
    await loadAnalytics();
  }
}

function setButtonText(btn: HTMLButtonElement | null, text: string) {
  const txt = btn?.querySelector('.button-text');
  if (txt) txt.textContent = text;
}

// Modal
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

// Language
function toggleDropdown() {
  const hidden = el.languageDropdown?.classList.contains('hidden');
  el.languageDropdown?.classList.toggle('hidden', !hidden);
  el.languageToggle?.classList.toggle('active', hidden);
}

function closeDropdown() {
  el.languageDropdown?.classList.add('hidden');
  el.languageToggle?.classList.remove('active');
}

function updateLanguageDropdown() {
  const lang = i18n.getCurrentLanguage();
  document
    .querySelectorAll('.language-option')
    .forEach(o => o.classList.toggle('active', o.getAttribute('data-lang') === lang));
  const langName = lang === 'he' ? i18n.getMessage('languageHebrew') : i18n.getMessage('languageEnglish');
  const txt = document.querySelector('.language-text');
  if (txt) txt.textContent = `${i18n.getMessage('languageToggle')} (${langName})`;
}

async function handleLanguageOption(e: Event) {
  const lang = (e.target as HTMLElement).closest('.language-option')?.getAttribute('data-lang') as 'en' | 'he' | null;
  if (!lang || !['en', 'he'].includes(lang)) return;
  try {
    await i18n.switchLanguage(lang);
    updateAllText();
    context = await detectContext();
    updateInterface();
    updateUIState(el.extensionToggle?.checked ?? false, true);
    await loadAnalytics();
    updateLanguageDropdown();
    closeDropdown();
    showStatus(el.statusDiv, `✅ ${i18n.getMessage('successLanguageChanged')}`, 'success');
  } catch {
    showStatus(el.statusDiv, `❌ ${i18n.getMessage('errorLanguageSwitchFailed')}`, 'error');
  }
}

// Analytics
async function loadAnalytics() {
  const data = await storage.get();
  const stats: Record<string, string> = {
    statLastCopied: i18n.formatCounterValue(
      data.analytics.operations.copy.lastTime,
      data.analytics.operations.copy.success,
      data.analytics.operations.copy.failures
    ),
    statLastPasted: i18n.formatCounterValue(
      data.analytics.operations.paste.lastTime,
      data.analytics.operations.paste.success,
      data.analytics.operations.paste.failures
    ),
    statLastAutoClick: i18n.formatCounterValue(
      data.analytics.operations.autoClick.lastTime,
      data.analytics.operations.autoClick.success,
      data.analytics.operations.autoClick.failures
    ),
    statTotalOperations: String(data.analytics.totalOperations),
    statSuccessRate: `${data.analytics.successRate}%`,
  };
  for (const [key, value] of Object.entries(stats)) {
    const label = el.analyticsSection?.querySelector(`.stat-label[data-i18n="${key}"]`);
    const valueEl = label?.closest('.stat-item')?.querySelector('.stat-value');
    if (valueEl) valueEl.textContent = value;
  }
}

init();
