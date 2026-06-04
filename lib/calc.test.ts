import { describe, expect, it } from "vitest";
import {
  CALC_CONSTANTS,
  calculateNightHours,
  calculateOvertime,
  calculateSalary,
  isValidHourlyRate,
  timeToDecimal,
} from "./calc";
import type { ParsedTimesheetRow } from "./types";

describe("CALC_CONSTANTS", () => {
  it("names the night-window thresholds", () => {
    expect(CALC_CONSTANTS.FRIDAY_NIGHT_START).toBe(16);
    expect(CALC_CONSTANTS.WEEKDAY_NIGHT_START).toBe(22);
    expect(CALC_CONSTANTS.WEEKDAY_NIGHT_END).toBe(6);
    expect(CALC_CONSTANTS.DAY_WRAP_HOUR).toBe(24);
  });
});

describe("timeToDecimal", () => {
  it("converts HH:MM to decimal hours", () => {
    expect(timeToDecimal("9:30")).toBe(9.5);
    expect(timeToDecimal("0:00")).toBe(0);
    expect(timeToDecimal("23:45")).toBe(23.75);
    expect(timeToDecimal("24:00")).toBe(24);
  });
});

describe("isValidHourlyRate", () => {
  it("accepts only positive finite numbers", () => {
    expect(isValidHourlyRate(1)).toBe(true);
    expect(isValidHourlyRate(0)).toBe(false);
    expect(isValidHourlyRate(-1)).toBe(false);
    expect(isValidHourlyRate(Infinity)).toBe(false);
    expect(isValidHourlyRate(NaN)).toBe(false);
  });
});

describe("calculateOvertime", () => {
  it("pays 125% between 9 and 11 hours and 150% beyond 11", () => {
    expect(calculateOvertime(8)).toEqual({ ot125: 0, ot150: 0 });
    expect(calculateOvertime(9)).toEqual({ ot125: 0, ot150: 0 });
    expect(calculateOvertime(10)).toEqual({ ot125: 1, ot150: 0 });
    expect(calculateOvertime(12)).toEqual({ ot125: 2, ot150: 1 });
  });
});

describe("calculateNightHours", () => {
  it("returns zero for a plain daytime weekday shift", () => {
    expect(calculateNightHours("09:00", "17:00", 1)).toBe(0);
  });

  it("counts weekday hours after 22:00", () => {
    expect(calculateNightHours("20:00", "23:30", 1)).toBe(1.5);
  });

  it("counts weekday hours before 06:00", () => {
    expect(calculateNightHours("04:00", "08:00", 1)).toBe(2);
  });

  it("handles a weekday shift that wraps past midnight", () => {
    expect(calculateNightHours("22:00", "02:00", 1)).toBe(4);
  });

  it("counts Friday evening from 16:00", () => {
    expect(calculateNightHours("16:00", "20:00", 5)).toBe(4);
    expect(calculateNightHours("10:00", "14:00", 5)).toBe(0);
  });

  it("counts the whole Saturday shift as night", () => {
    expect(calculateNightHours("08:00", "16:00", 6)).toBe(8);
  });
});

describe("calculateSalary", () => {
  it("aggregates regular, night, overtime, vacation, travel and meal pay", () => {
    const rows: ParsedTimesheetRow[] = [
      {
        date: "03/04",
        dayOfWeek: 2,
        entryTime: "08:00",
        exitTime: "18:00",
        totalHours: 10,
        reportType: "regular",
        isHoliday: false,
      },
      {
        date: "04/04",
        dayOfWeek: 6,
        entryTime: "09:00",
        exitTime: "13:00",
        totalHours: 4,
        reportType: "regular",
        isHoliday: false,
      },
      {
        date: "05/04",
        dayOfWeek: 4,
        entryTime: "",
        exitTime: "",
        totalHours: 0,
        reportType: "vacation",
        isHoliday: false,
      },
      {
        date: "02/04",
        dayOfWeek: 3,
        entryTime: "",
        exitTime: "",
        totalHours: 0,
        reportType: "absence",
        isHoliday: false,
      },
    ];

    expect(calculateSalary(rows, 50)).toEqual({
      totalPay: 1279.5,
      regularHours: 10,
      regularPay: 500,
      nightHours: 4,
      nightPay: 300,
      vacationDays: 1,
      vacationPay: 400,
      workDays: 2,
      workDaysPay: 800,
      travelRefund: 52,
      mealRefund: 15,
      mealEligibleDays: 1,
      overtime125Hours: 1,
      overtime125Pay: 12.5,
      overtime150Hours: 0,
      overtime150Pay: 0,
      periodStart: "02/04",
      periodEnd: "05/04",
    });
  });
});
