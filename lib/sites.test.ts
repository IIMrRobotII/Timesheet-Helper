import { describe, expect, it } from "vitest";
import {
  detectSite,
  dominantPeriod,
  hebrewMonthToPeriod,
  isShortcutCommand,
  isValidTime,
  monthYearFromDate,
  parseHilanDate,
  periodsMatch,
  pickTabForSite,
  resolveShortcut,
  sanitizeTime,
} from "./sites";

const HILAN_URL = "https://abc.hilan.co.il/Hilannetv2/Attendance/calendar";
const MALAM_URL = "https://payroll.malam.com/Salprd5Root/faces/timecard";

describe("detectSite", () => {
  it("detects the Hilan attendance page as a copy source", () => {
    const site = detectSite("https://abc.hilan.co.il/Hilannetv2/Attendance/calendar");
    expect(site?.name).toBe("HILAN");
    expect(site?.action).toBe("copy");
  });

  it("detects the Malam payroll page as a paste target", () => {
    const site = detectSite("https://payroll.malam.com/Salprd5Root/faces/timecard");
    expect(site?.name).toBe("MALAM");
    expect(site?.action).toBe("paste");
  });

  it("matches regardless of case", () => {
    expect(detectSite("https://HILAN.CO.IL/Hilannetv2/ATTENDANCE/x")?.name).toBe("HILAN");
  });

  it("returns null when the domain matches but the path does not", () => {
    expect(detectSite("https://hilan.co.il/some/other/page")).toBeNull();
  });

  it("does not match domain text on an unrelated host", () => {
    expect(detectSite("https://evil.test/hilan.co.il/Hilannetv2/Attendance/calendar")).toBeNull();
  });

  it("does not match attendance path text outside the pathname", () => {
    expect(detectSite("https://abc.hilan.co.il/other/page?next=/Hilannetv2/Attendance/calendar")).toBeNull();
  });

  it("returns null for unrelated sites", () => {
    expect(detectSite("https://www.google.com")).toBeNull();
  });
});

describe("isShortcutCommand", () => {
  it("accepts the declared command names", () => {
    expect(isShortcutCommand("copy-hours")).toBe(true);
    expect(isShortcutCommand("paste-hours")).toBe(true);
    expect(isShortcutCommand("auto-click")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isShortcutCommand("delete-hours")).toBe(false);
    expect(isShortcutCommand("")).toBe(false);
  });
});

describe("resolveShortcut", () => {
  it("maps each command to its action on the matching site", () => {
    expect(resolveShortcut("copy-hours", HILAN_URL)).toBe("copyHours");
    expect(resolveShortcut("paste-hours", MALAM_URL)).toBe("copyHours");
    expect(resolveShortcut("auto-click", HILAN_URL)).toBe("autoClickTimeBoxes");
  });

  it("returns null on the wrong site for each command", () => {
    expect(resolveShortcut("copy-hours", MALAM_URL)).toBeNull();
    expect(resolveShortcut("paste-hours", HILAN_URL)).toBeNull();
    expect(resolveShortcut("auto-click", MALAM_URL)).toBeNull();
  });

  it("returns null for unsupported pages and unknown commands", () => {
    expect(resolveShortcut("copy-hours", "https://www.google.com")).toBeNull();
    expect(resolveShortcut("auto-click", "")).toBeNull();
    expect(resolveShortcut("delete-hours", HILAN_URL)).toBeNull();
  });
});

describe("pickTabForSite", () => {
  const tabs = [
    { id: 1, url: "https://www.google.com", active: true },
    { id: 2, url: HILAN_URL, active: false },
    { id: 3, url: MALAM_URL, active: false },
  ];

  it("finds the Hilan and Malam tabs by URL", () => {
    expect(pickTabForSite(tabs, "HILAN")).toBe(2);
    expect(pickTabForSite(tabs, "MALAM")).toBe(3);
  });

  it("prefers an active matching tab over an inactive one", () => {
    const two = [
      { id: 5, url: HILAN_URL, active: false },
      { id: 6, url: HILAN_URL, active: true },
    ];
    expect(pickTabForSite(two, "HILAN")).toBe(6);
  });

  it("prefers the matching tab in the preferred window", () => {
    const twoWindows = [
      { id: 5, url: HILAN_URL, active: true, windowId: 1 },
      { id: 6, url: HILAN_URL, active: false, windowId: 2 },
    ];
    expect(pickTabForSite(twoWindows, "HILAN", 2)).toBe(6);
  });

  it("does not treat missing windowId as a preferred window", () => {
    const mixedWindowMetadata = [
      { id: 5, url: HILAN_URL, active: false },
      { id: 6, url: HILAN_URL, active: true, windowId: 2 },
    ];
    expect(pickTabForSite(mixedWindowMetadata, "HILAN")).toBe(6);
  });

  it("returns null when nothing matches or id/url is missing", () => {
    expect(pickTabForSite([], "MALAM")).toBeNull();
    expect(pickTabForSite([{ id: 1, url: "https://www.google.com" }], "HILAN")).toBeNull();
    expect(pickTabForSite([{ url: HILAN_URL }, { id: 9 }], "HILAN")).toBeNull();
  });
});

describe("parseHilanDate", () => {
  it("parses DD/MM and DD/MM/YYYY, keeping the matched text and ignoring trailing content", () => {
    expect(parseHilanDate("03/04 יום ג")).toEqual({ day: 3, month: 4, year: null, text: "03/04" });
    expect(parseHilanDate("28/04/2026")).toEqual({ day: 28, month: 4, year: 2026, text: "28/04/2026" });
    expect(parseHilanDate("nope")).toBeNull();
  });
});

describe("month detection", () => {
  it("monthYearFromDate reads DD/MM and DD/MM/YYYY", () => {
    expect(monthYearFromDate("01/05 ראשון")).toEqual({ month: 5, year: null });
    expect(monthYearFromDate("28/04/2026")).toEqual({ month: 4, year: 2026 });
    expect(monthYearFromDate("nope")).toEqual({ month: null, year: null });
  });

  it("dominantPeriod picks the most common month and ignores edge days", () => {
    expect(dominantPeriod(["28/04", "01/05", "02/05", "03/05"])).toEqual({ month: 5, year: null });
    expect(dominantPeriod(["01/05/2026", "02/05/2026"])).toEqual({ month: 5, year: 2026 });
    expect(dominantPeriod([])).toEqual({ month: null, year: null });
  });

  it("periodsMatch compares month, plus year when both have it", () => {
    expect(periodsMatch({ month: 5, year: null }, { month: 5, year: 2026 })).toBe(true);
    expect(periodsMatch({ month: 5, year: 2025 }, { month: 5, year: 2026 })).toBe(false);
    expect(periodsMatch({ month: 5, year: null }, { month: 4, year: null })).toBe(false);
    expect(periodsMatch({ month: null, year: null }, { month: 4, year: 2026 })).toBe(true);
  });

  it("hebrewMonthToPeriod reads the Hilan month-picker label", () => {
    expect(hebrewMonthToPeriod("יוני 2026")).toEqual({ month: 6, year: 2026 });
    expect(hebrewMonthToPeriod("מאי 2025")).toEqual({ month: 5, year: 2025 });
    expect(hebrewMonthToPeriod("ינואר 2026")).toEqual({ month: 1, year: 2026 });
    expect(hebrewMonthToPeriod("whatever")).toEqual({ month: null, year: null });
  });
});

describe("isValidTime", () => {
  it("accepts H:MM and HH:MM, trimming surrounding space", () => {
    expect(isValidTime("9:30")).toBe(true);
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime(" 9:30 ")).toBe(true);
  });

  it("rejects malformed or empty values", () => {
    expect(isValidTime("9:3")).toBe(false);
    expect(isValidTime("abc")).toBe(false);
    expect(isValidTime("")).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
  });
});

describe("sanitizeTime", () => {
  it("strips everything except digits and colon", () => {
    expect(sanitizeTime(" 09:30 ")).toBe("09:30");
    expect(sanitizeTime("ab09:30cd")).toBe("09:30");
  });

  it("returns null for nullish input", () => {
    expect(sanitizeTime(null)).toBeNull();
    expect(sanitizeTime(undefined)).toBeNull();
    expect(sanitizeTime("")).toBeNull();
  });
});
