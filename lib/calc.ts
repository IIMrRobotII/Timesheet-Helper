import type { CalculatorResult, ParsedTimesheetRow } from "./types";

export const CALC_CONSTANTS = {
  TRAVEL_REFUND_PER_DAY: 26,
  MEAL_REFUND_PER_DAY: 15,
  MEAL_ELIGIBLE_HOURS: 6,
  NIGHT_MULTIPLIER: 1.5,
  VACATION_HOURS_PER_DAY: 8,
  OT_125_START: 9,
  OT_125_END: 11,
  OT_150_START: 11,
} as const;

export const DAY_MAP: Record<string, number> = {
  "יום א": 0,
  "יום ב": 1,
  "יום ג": 2,
  "יום ד": 3,
  "יום ה": 4,
  "יום ו": 5,
  שבת: 6,
};

export const timeToDecimal = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
};

export const isValidHourlyRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const calculateNightHours = (entry: string, exit: string, dayOfWeek: number): number => {
  if (!entry || !exit) return 0;
  const entryDec = timeToDecimal(entry);
  let exitDec = timeToDecimal(exit);
  if (exitDec < entryDec) exitDec += 24;
  const totalHours = exitDec - entryDec;
  let nightHours = 0;

  if (dayOfWeek === 5) {
    if (entryDec >= 16 || exitDec > 16) {
      nightHours = Math.max(0, Math.min(exitDec, 24) - Math.max(entryDec, 16));
      if (exitDec > 24) nightHours += Math.min(exitDec - 24, 6);
    }
  } else if (dayOfWeek === 6) {
    nightHours = totalHours;
  } else {
    if (exitDec > 22) nightHours += Math.min(exitDec, 24) - Math.max(entryDec, 22);
    if (exitDec > 24) nightHours += Math.min(exitDec - 24, 6);
    if (entryDec < 6) nightHours += Math.min(6, exitDec) - entryDec;
  }
  return Math.min(Math.max(0, nightHours), totalHours);
};

export const calculateOvertime = (totalHours: number): { ot125: number; ot150: number } => ({
  ot125: Math.max(0, Math.min(totalHours, CALC_CONSTANTS.OT_125_END) - CALC_CONSTANTS.OT_125_START),
  ot150: Math.max(0, totalHours - CALC_CONSTANTS.OT_150_START),
});

export const calculateSalary = (rows: ParsedTimesheetRow[], hourlyRate: number): CalculatorResult => {
  let regularHours = 0;
  let nightHours = 0;
  let vacationDays = 0;
  let workDays = 0;
  let mealEligibleDays = 0;
  let ot125Hours = 0;
  let ot150Hours = 0;
  let periodStart = "";
  let periodEnd = "";
  let minDateVal = Infinity;
  let maxDateVal = -Infinity;

  for (const row of rows) {
    const parts = row.date.split("/");
    const d = parseInt(parts[0] || "0", 10);
    const m = parseInt(parts[1] || "0", 10);
    const dateVal = m * 100 + d;
    if (dateVal < minDateVal) {
      minDateVal = dateVal;
      periodStart = row.date;
    }
    if (dateVal > maxDateVal) {
      maxDateVal = dateVal;
      periodEnd = row.date;
    }
    if (row.reportType === "absence") continue;
    if (row.reportType === "vacation") {
      vacationDays++;
      continue;
    }
    if (row.totalHours <= 0) continue;
    workDays++;
    const night = calculateNightHours(row.entryTime, row.exitTime, row.dayOfWeek);
    nightHours += night;
    regularHours += row.totalHours - night;
    if (row.totalHours >= CALC_CONSTANTS.MEAL_ELIGIBLE_HOURS) mealEligibleDays++;
    const ot = calculateOvertime(row.totalHours);
    ot125Hours += ot.ot125;
    ot150Hours += ot.ot150;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const regularPay = hourlyRate * regularHours;
  const nightPay = hourlyRate * CALC_CONSTANTS.NIGHT_MULTIPLIER * nightHours;
  const vacationPay = hourlyRate * CALC_CONSTANTS.VACATION_HOURS_PER_DAY * vacationDays;
  const workDaysPay = regularPay + nightPay;
  const travelRefund = CALC_CONSTANTS.TRAVEL_REFUND_PER_DAY * workDays;
  const mealRefund = CALC_CONSTANTS.MEAL_REFUND_PER_DAY * mealEligibleDays;
  const ot125Pay = hourlyRate * 0.25 * ot125Hours;
  const ot150Pay = hourlyRate * 0.5 * ot150Hours;
  const totalPay = regularPay + nightPay + vacationPay + travelRefund + mealRefund + ot125Pay + ot150Pay;

  return {
    totalPay: round(totalPay),
    regularHours: round(regularHours),
    regularPay: round(regularPay),
    nightHours: round(nightHours),
    nightPay: round(nightPay),
    vacationDays,
    vacationPay: round(vacationPay),
    workDays,
    workDaysPay: round(workDaysPay),
    travelRefund,
    mealRefund,
    mealEligibleDays,
    overtime125Hours: round(ot125Hours),
    overtime125Pay: round(ot125Pay),
    overtime150Hours: round(ot150Hours),
    overtime150Pay: round(ot150Pay),
    periodStart,
    periodEnd,
  };
};
