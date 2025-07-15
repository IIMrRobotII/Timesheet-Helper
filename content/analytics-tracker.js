class AnalyticsTracker {
  constructor() {
    this.storage = window.TimesheetCommon.storage;
    this.STORAGE_KEYS = window.TimesheetCommon.STORAGE_KEYS;
  }

  //Track operation success/failure and update analytics
  async track(event, success, metadata = {}) {
    const timestamp = new Date().toISOString();
    const updates = {};

    if (success) {
      const eventMap = {
        copy: {
          time: this.STORAGE_KEYS.LAST_COPY,
          count: this.STORAGE_KEYS.TOTAL_COPIES,
        },
        paste: {
          time: this.STORAGE_KEYS.LAST_PASTE,
          count: this.STORAGE_KEYS.TOTAL_PASTES,
        },
        autoClick: {
          time: this.STORAGE_KEYS.LAST_AUTO_CLICK,
          count: this.STORAGE_KEYS.TOTAL_AUTO_CLICKS,
        },
      };

      const mapping = eventMap[event];
      if (mapping) {
        updates[mapping.time] = timestamp;
        const currentCount = (await this.storage.get(mapping.count)) || 0;
        updates[mapping.count] = currentCount + 1;
      }
    } else {
      // Track both total failures and per-operation failures
      const totalFailures =
        (await this.storage.get(this.STORAGE_KEYS.TOTAL_FAILURES)) || 0;
      updates[this.STORAGE_KEYS.TOTAL_FAILURES] = totalFailures + 1;

      // Track specific operation failures
      const failureMap = {
        copy: this.STORAGE_KEYS.COPY_FAILURES,
        paste: this.STORAGE_KEYS.PASTE_FAILURES,
        autoClick: this.STORAGE_KEYS.AUTO_CLICK_FAILURES,
      };

      const failureKey = failureMap[event];
      if (failureKey) {
        const currentFailures = (await this.storage.get(failureKey)) || 0;
        updates[failureKey] = currentFailures + 1;
      }
    }

    await this.storage.setBatch(updates);
    await this.updateSuccessRate();
  }

  //Calculate and update success rate percentage
  async updateSuccessRate() {
    const data = await this.storage.getBatch([
      this.STORAGE_KEYS.TOTAL_COPIES,
      this.STORAGE_KEYS.TOTAL_PASTES,
      this.STORAGE_KEYS.TOTAL_AUTO_CLICKS,
      this.STORAGE_KEYS.TOTAL_FAILURES,
    ]);

    const successful =
      (data[this.STORAGE_KEYS.TOTAL_COPIES] || 0) +
      (data[this.STORAGE_KEYS.TOTAL_PASTES] || 0) +
      (data[this.STORAGE_KEYS.TOTAL_AUTO_CLICKS] || 0);
    const total = successful + (data[this.STORAGE_KEYS.TOTAL_FAILURES] || 0);
    const rate = total > 0 ? Math.round((successful / total) * 100) : 0;

    await this.storage.set(this.STORAGE_KEYS.SUCCESS_RATE, rate);
  }
}

// Export for content script
window.AnalyticsTracker = AnalyticsTracker;
