import { storage } from './lib';
import * as i18n from './i18n';
import type { CalculatorResult } from './types';

export const setText = (node: Element | null | undefined, text: string) => node && (node.textContent = text);
export const setById = (id: string, text: string) => setText(document.getElementById(id), text);

export function displayResults(result: CalculatorResult) {
  document.getElementById('calculatorResults')?.classList.remove('hidden');
  setText(document.getElementById('calcPeriod'), `${result.periodStart} - ${result.periodEnd}`);

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (amt: number, cnt: number | string, suf: string) =>
    `₪${formatCurrency(amt)} (${typeof cnt === 'number' ? cnt.toFixed(1) : cnt}${suf})`;
  const fmtTime = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}h`;

  const totalHours = result.regularHours + result.nightHours;
  setById('resultTotalPay', `₪${formatCurrency(result.totalPay)} (${fmtTime(totalHours)})`);
  setById('resultRegular', fmt(result.regularPay, fmtTime(result.regularHours), ''));
  setById('resultNight', fmt(result.nightPay, fmtTime(result.nightHours), ''));
  setById('resultWorkDays', fmt(result.workDaysPay, result.workDays, 'd'));
  setById('resultVacation', fmt(result.vacationPay, result.vacationDays, 'd'));
  setById('resultTravel', fmt(result.travelRefund, result.workDays, 'd'));
  setById('resultMeal', fmt(result.mealRefund, result.mealEligibleDays, 'd'));
  setById('resultOT125', fmt(result.overtime125Pay, fmtTime(result.overtime125Hours), ''));
  setById('resultOT150', fmt(result.overtime150Pay, fmtTime(result.overtime150Hours), ''));
}

export async function loadAnalytics() {
  const data = await storage.get();
  const ops = data.analytics.operations;
  const formatOp = (op: (typeof ops)['copy']) => i18n.formatCounterValue(op.lastTime, op.success, op.failures);
  const stats: Record<string, string> = {
    statLastCopied: formatOp(ops.copy),
    statLastPasted: formatOp(ops.paste),
    statLastAutoClick: formatOp(ops.autoClick),
    statTotalOperations: String(data.analytics.totalOperations),
    statSuccessRate: `${data.analytics.successRate}%`,
  };

  const statisticsContent = document.getElementById('statisticsContent');
  for (const [key, value] of Object.entries(stats)) {
    const label = statisticsContent?.querySelector(`.stat-label[data-i18n="${key}"]`);
    const valueEl = label?.closest('.stat-item')?.querySelector('.stat-value');
    if (valueEl) valueEl.textContent = value;
  }
}
