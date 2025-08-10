import { storage, ERROR_CODES, utils } from '@/shared/common';
import AnalyticsTracker from './analytics-tracker';
import TimesheetOperations from './timesheet-operations';
import type {
  ExtensionMessage,
  ExtensionResponse,
  DetectedSite,
  ErrorCode,
  StorageSchema,
  OperationResult,
} from '@/types';

class TimesheetExtension {
  private isProcessing: boolean = false;
  private currentSite: DetectedSite | null;
  private analytics: AnalyticsTracker;
  private operations: TimesheetOperations;

  constructor() {
    this.currentSite = utils.detectSite(location.href);

    this.analytics = new AnalyticsTracker();
    this.operations = new TimesheetOperations();

    chrome.runtime.onMessage.addListener(
      (
        request: ExtensionMessage,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: ExtensionResponse) => void
      ) => {
        this.handleMessage(request, sender, sendResponse);
        return true;
      }
    );
  }

  async handleMessage(
    request: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ): Promise<void> {
    try {
      const enabledData = (await storage.get([
        'extensionEnabled',
      ] as (keyof StorageSchema)[])) as Partial<StorageSchema>;
      const isEnabled = enabledData.extensionEnabled as boolean | undefined;
      if (isEnabled === false) {
        return sendResponse({
          success: false,
          timestamp: new Date().toISOString(),
          error: { code: ERROR_CODES['EXT_DISABLED']! },
        });
      }

      if (this.isProcessing) {
        return sendResponse({
          success: false,
          timestamp: new Date().toISOString(),
          error: { code: ERROR_CODES['OPERATION_IN_PROGRESS']! },
        });
      }

      this.isProcessing = true;

      try {
        const result = await this.executeAction(request.action);
        sendResponse(result);
      } finally {
        this.isProcessing = false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      sendResponse({
        success: false,
        timestamp: new Date().toISOString(),
        error: { code: 'UNEXPECTED_ERROR' as ErrorCode, message: errorMessage },
      });
      this.isProcessing = false;
    }
  }

  async executeAction(action: string): Promise<ExtensionResponse> {
    if (!this.currentSite) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: { code: ERROR_CODES['WRONG_SITE']! },
      };
    }

    try {
      let result:
        | OperationResult
        | { clickedCount: number; totalBoxes: number; skippedCount: number };
      let eventType: 'autoClick' | 'copy' | 'paste';

      switch (action) {
        case 'autoClickTimeBoxes':
          if (this.currentSite.action !== 'copy') {
            return {
              success: false,
              timestamp: new Date().toISOString(),
              error: { code: ERROR_CODES['WRONG_SITE']! },
            };
          }
          result = await this.operations.performAutoClick();
          eventType = 'autoClick';
          break;

        case 'copyHours':
          if (this.currentSite.action === 'copy') {
            result = await this.operations.copyTimesheetData();
            eventType = 'copy';
          } else if (this.currentSite.action === 'paste') {
            result = await this.operations.pasteTimesheetData();
            eventType = 'paste';
          } else {
            throw new Error(ERROR_CODES['WRONG_SITE']);
          }
          break;

        default:
          return {
            success: false,
            timestamp: new Date().toISOString(),
            error: { code: 'INVALID_ACTION' as ErrorCode },
          };
      }

      await this.analytics.track(eventType, true);
      await utils.delay(100);
      return { success: true, timestamp: new Date().toISOString(), ...result };
    } catch (error) {
      let failureEventType: 'autoClick' | 'copy' | 'paste';
      let failureErrorCode: ErrorCode;

      if (action === 'autoClickTimeBoxes') {
        failureEventType = 'autoClick';
        failureErrorCode = ERROR_CODES['NO_TIME_BOXES']!;
      } else {
        failureEventType =
          this.currentSite.action === 'copy' ? 'copy' : 'paste';
        failureErrorCode =
          this.currentSite.action === 'copy'
            ? ERROR_CODES['COPY_FAILED']!
            : ERROR_CODES['PASTE_FAILED']!;
      }

      await this.analytics.track(failureEventType, false);
      await utils.delay(100);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: { code: failureErrorCode },
      };
    }
  }
}

new TimesheetExtension();
