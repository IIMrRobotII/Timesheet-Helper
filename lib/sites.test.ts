import { describe, expect, it } from "vitest";
import { detectSite, isValidTime, sanitizeTime } from "./sites";

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

  it("returns null for unrelated sites", () => {
    expect(detectSite("https://www.google.com")).toBeNull();
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
