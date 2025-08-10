import { storage } from '@/shared/common';
import type { AnalyticsEventType, StorageSchema } from '@/types';

export class AnalyticsTracker {
  async track(event: AnalyticsEventType, success: boolean): Promise<void> {
    const timestamp = new Date().toISOString();

    const requiredKeys: (keyof StorageSchema)[] = [
      'analytics',
      'statisticsEnabled',
    ];
    const currentData = await storage.get(requiredKeys);
    if (currentData.statisticsEnabled === false) {
      return;
    }
    const analytics = { ...currentData.analytics };

    const operation = analytics.operations[event];
    if (success) {
      operation.success += 1;
      operation.lastTime = timestamp;
    } else {
      operation.failures += 1;
    }

    const totalSuccess =
      analytics.operations.copy.success +
      analytics.operations.paste.success +
      analytics.operations.autoClick.success;
    const totalFailures =
      analytics.operations.copy.failures +
      analytics.operations.paste.failures +
      analytics.operations.autoClick.failures;

    analytics.totalOperations = totalSuccess + totalFailures;
    analytics.successRate =
      analytics.totalOperations > 0
        ? Math.round((totalSuccess / analytics.totalOperations) * 100)
        : 0;

    await storage.set({ analytics });
  }
}

export default AnalyticsTracker;
