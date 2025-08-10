import type { ExtensionResponse, UIContext, I18nManager } from '@/types';

export type StatusType =
  | 'message'
  | 'success'
  | 'error'
  | 'warning'
  | 'working'
  | 'info';

export class StatusManager {
  static showStatus(
    statusElement: HTMLElement | null,
    message: string | [string, StatusType] | null,
    type: StatusType = 'message'
  ): void {
    if (!statusElement) {
      return;
    }

    if (!message) {
      statusElement.className = '';
      statusElement.classList.remove('visible');
      return;
    }

    let finalMessage: string = '';
    let finalType: StatusType = type;

    if (Array.isArray(message)) {
      [finalMessage, finalType] = message;
    } else {
      finalMessage = message;
    }

    statusElement.textContent = finalMessage;
    statusElement.className = `visible status-${finalType}`;
  }

  static getErrorMessage(
    source: ExtensionResponse | Error,
    i18n: I18nManager
  ): string {
    if (source instanceof Error) {
      if (source.message.includes('COMMUNICATION_TIMEOUT')) {
        return `⏱️ ${i18n.getMessage('errorOperationTimedOut')}`;
      }
      if (source.message.includes('Communication failed')) {
        return `⚠️ ${i18n.getMessage('errorCommunicationIssue')}`;
      }
      return `❌ ${i18n.getMessage('errorOperationFailed')}: ${source.message}`;
    }

    const errorMessages = i18n.getErrorMessages();
    const errorMap: Record<string, string> = {
      EXT_DISABLED: errorMessages['extensionDisabled'] || 'Extension disabled',
      WRONG_SITE: errorMessages['wrongSite'] || 'Wrong site',
      NO_DATA: errorMessages['noData'] || 'No data',
      OPERATION_IN_PROGRESS:
        errorMessages['inProgress'] || 'Operation in progress',
      NO_TIME_BOXES: errorMessages['noTimeBoxes'] || 'No time boxes',
      COPY_FAILED: errorMessages['copyFailed'] || 'Copy failed',
      PASTE_FAILED: errorMessages['pasteFailed'] || 'Paste failed',
      INVALID_ACTION: errorMessages['invalidAction'] || 'Invalid action',
    };

    return (
      errorMap[source.error?.code ?? ''] ||
      source.error?.message ||
      i18n.getMessage('errorInProgress')
    );
  }

  static formatSuccessMessage(
    action: string,
    response: ExtensionResponse,
    context: UIContext,
    i18n: I18nManager
  ): string {
    if (action === 'autoClickTimeBoxes') {
      return i18n.getMessage('successAutoClick', [
        (response.clickedCount || 0).toString(),
        (response.totalBoxes || 0).toString(),
      ]);
    } else {
      const messageKey =
        context.primaryAction === 'copy' ? 'successCopied' : 'successPasted';
      return i18n.getMessage(messageKey, [(response.count || 0).toString()]);
    }
  }

  static createError(message: string): Error {
    return new Error(message);
  }

  static createTimeoutError(): Error {
    return new Error('COMMUNICATION_TIMEOUT');
  }

  static createCommunicationError(details: string): Error {
    return new Error(`Communication failed: ${details}`);
  }
}

export default StatusManager;
