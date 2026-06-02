import { defineContentScript } from "#imports";
import { detectSite, ERROR_CODES, delay } from "@/lib/sites";
import { copyTimesheetData, pasteTimesheetData, performAutoClick, parseTimesheetFromDOM } from "@/lib/dom";
import { calculateSalary, isValidHourlyRate } from "@/lib/calc";
import { getSettings } from "@/lib/storage";
import type { ExtensionAction, ExtensionMessage, ExtensionResponse } from "@/lib/types";

export default defineContentScript({
  matches: [
    "https://*.hilan.co.il/Hilannetv2/Attendance/*",
    "https://*.hilan.co.il/Hilannetv2/attendance/*",
    "https://payroll.malam.com/Salprd5Root/faces/*",
  ],
  runAt: "document_end",
  main() {
    const currentSite = detectSite(location.href);
    let isProcessing = false;

    async function executeAction(action: ExtensionAction, hourlyRate?: number): Promise<ExtensionResponse> {
      if (!currentSite) return { success: false, error: { code: ERROR_CODES.WRONG_SITE } };

      if (action === "calculateSalary") {
        if (currentSite.action !== "copy") return { success: false, error: { code: ERROR_CODES.WRONG_SITE } };
        if (!isValidHourlyRate(hourlyRate)) return { success: false, error: { code: ERROR_CODES.INVALID_RATE } };
        const rows = parseTimesheetFromDOM();
        if (rows.length === 0) return { success: false, error: { code: ERROR_CODES.NO_DATA } };
        return { success: true, calculatorResult: calculateSalary(rows, hourlyRate) };
      }

      try {
        let result: { count?: number; clickedCount?: number; totalBoxes?: number; skippedCount?: number };
        if (action === "autoClickTimeBoxes") {
          if (currentSite.action !== "copy") return { success: false, error: { code: ERROR_CODES.WRONG_SITE } };
          result = await performAutoClick();
        } else if (action === "copyHours") {
          if (currentSite.action === "copy") result = await copyTimesheetData();
          else result = await pasteTimesheetData();
        } else {
          return { success: false, error: { code: ERROR_CODES.INVALID_ACTION } };
        }
        await delay(100);
        return { success: true, ...result };
      } catch {
        const code =
          action === "autoClickTimeBoxes"
            ? ERROR_CODES.NO_TIME_BOXES
            : currentSite.action === "copy"
              ? ERROR_CODES.COPY_FAILED
              : ERROR_CODES.PASTE_FAILED;
        await delay(100);
        return { success: false, error: { code } };
      }
    }

    async function handleMessage(request: ExtensionMessage, sendResponse: (response: ExtensionResponse) => void) {
      try {
        const { extensionEnabled } = await getSettings();
        if (!extensionEnabled) return sendResponse({ success: false, error: { code: ERROR_CODES.EXT_DISABLED } });
        if (isProcessing) return sendResponse({ success: false, error: { code: ERROR_CODES.OPERATION_IN_PROGRESS } });
        isProcessing = true;
        sendResponse(await executeAction(request.action, request.hourlyRate));
      } catch (e) {
        sendResponse({
          success: false,
          error: { code: ERROR_CODES.UNEXPECTED_ERROR, message: e instanceof Error ? e.message : "Unknown error" },
        });
      } finally {
        isProcessing = false;
      }
    }

    chrome.runtime.onMessage.addListener(
      (request: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
        void handleMessage(request, sendResponse);
        return true;
      }
    );
  },
});
