window.StatusManager = {
  showStatus(statusElement, message, type = "message") {
    if (!statusElement) return;

    if (!message) {
      statusElement.className = "";
      statusElement.style.display = "none";
      return;
    }

    if (Array.isArray(message)) {
      [message, type] = message;
    }

    statusElement.textContent = message;
    statusElement.className = `visible status-${type}`;
    statusElement.style.display = "block";
  },

  //Get error message from response
  getErrorMessage(response, i18n) {
    const errorMessages = i18n.getErrorMessages();
    const errorMap = {
      EXT_DISABLED: errorMessages.extensionDisabled,
      WRONG_SITE: errorMessages.wrongSite,
      NO_DATA: errorMessages.noData,
      OPERATION_IN_PROGRESS: errorMessages.inProgress,
      NO_TIME_BOXES: errorMessages.noTimeBoxes,
      COPY_FAILED: errorMessages.copyFailed,
      PASTE_FAILED: errorMessages.pasteFailed,
      INVALID_ACTION: errorMessages.invalidAction,
    };

    return (
      errorMap[response.error?.code] ||
      response.error?.message ||
      i18n.getMessage("errorInProgress")
    );
  },

  //Get error message from exception
  getErrorFromException(error, i18n) {
    if (error.message.includes("COMMUNICATION_TIMEOUT")) {
      return `⏱️ ${i18n.getMessage("errorOperationTimedOut")}`;
    }
    if (error.message.includes("Communication failed")) {
      return `⚠️ ${i18n.getMessage("errorCommunicationIssue")}`;
    }
    return `❌ ${i18n.getMessage("errorOperationFailed")}: ${error.message}`;
  },

  //Format success message with count
  formatSuccessMessage(action, response, context, i18n) {
    if (action === "autoClickTimeBoxes") {
      if (response.alreadySelected) {
        return i18n.getMessage("successAllBoxesSelected");
      }
      return i18n.formatSuccessMessage(
        "successAutoClick",
        response.clickedCount || 0,
        response.totalBoxes || 0
      );
    } else {
      const messageKey =
        context.primaryAction === "copy" ? "successCopied" : "successPasted";
      return i18n.formatSuccessMessage(messageKey, response.count || 0);
    }
  },
};
