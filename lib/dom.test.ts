import { beforeEach, describe, expect, it } from "vitest";
import { autoClickThenCopy, copyTimesheetData, parseTimesheetFromDOM, readHilanMonth } from "./dom";
import type { TimesheetData } from "./types";

const NBSP = " ";

const dateCell = (id: string, ov: string) => `<td id="cellOf_ReportDate_${id}" ov="${ov}"></td>`;
const dataCells = (id: string, entry: string, exit: string, total: string, option: string) =>
  `<td id="cellOf_ManualEntry_EmployeeReports_${id}" ov="${entry}"></td>` +
  `<td id="cellOf_ManualExit_EmployeeReports_${id}" ov="${exit}"></td>` +
  `<td id="cellOf_ManualTotal_EmployeeReports_${id}" ov="${total}"></td>` +
  `<td><select id="${id}_Symbol.SymbolId">${option}</select></td>`;

let stored: Record<string, unknown>;

beforeEach(() => {
  stored = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        set: async (values: Record<string, unknown>) => {
          Object.assign(stored, values);
        },
      },
    },
  };

  document.body.innerHTML = `<table><tbody>
    <tr>${dateCell("a", `03/04${NBSP}יום ג`)}${dataCells("a", "08:00", "18:00", "10:00", '<option value="0" selected>x</option>')}</tr>
    <tr>${dateCell("b", "04/04 יום ד")}${dataCells("b", "", "", "", '<option value="481" selected>חופשה</option>')}</tr>
    <tr>${dateCell("c", "06/04 יום ב")}${dataCells("c", "", "", "", '<option value="300" isabsencesymbol="true" selected>מחלה</option>')}</tr>
    <tr><td id="cellOf_ReportDate_d" rowspan="2" ov="05/04 יום ה"></td></tr>
    <tr>${dataCells("d", "10:00", "22:00", "12:00", '<option value="0" selected>x</option>')}</tr>
  </tbody></table>`;
  for (const sel of document.querySelectorAll("select")) {
    const i = Array.from(sel.options).findIndex(o => o.hasAttribute("selected"));
    sel.selectedIndex = i >= 0 ? i : 0;
  }
});

describe("parseTimesheetFromDOM", () => {
  it("parses regular, vacation, absence and holiday rows from a Hilan table", () => {
    expect(parseTimesheetFromDOM()).toEqual([
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
        dayOfWeek: 3,
        entryTime: "",
        exitTime: "",
        totalHours: 0,
        reportType: "vacation",
        isHoliday: false,
      },
      {
        date: "06/04",
        dayOfWeek: 1,
        entryTime: "",
        exitTime: "",
        totalHours: 0,
        reportType: "absence",
        isHoliday: false,
      },
      {
        date: "05/04",
        dayOfWeek: 4,
        entryTime: "10:00",
        exitTime: "22:00",
        totalHours: 12,
        reportType: "regular",
        isHoliday: true,
      },
    ]);
  });

  it("parses a date cell whose ov carries a year (DD/MM/YYYY)", () => {
    document.body.innerHTML = `<table><tbody>
      <tr>${dateCell("y", "12/05/2026 יום ג")}${dataCells("y", "08:00", "16:00", "08:00", '<option value="0" selected>x</option>')}</tr>
    </tbody></table>`;
    for (const sel of document.querySelectorAll("select")) {
      const i = Array.from(sel.options).findIndex(o => o.hasAttribute("selected"));
      sel.selectedIndex = i >= 0 ? i : 0;
    }

    expect(parseTimesheetFromDOM()).toEqual([
      {
        date: "12/05/2026",
        dayOfWeek: 2,
        entryTime: "08:00",
        exitTime: "16:00",
        totalHours: 8,
        reportType: "regular",
        isHoliday: false,
      },
    ]);
  });
});

describe("readHilanMonth", () => {
  it("returns the dominant month of the visible Hilan timesheet", () => {
    expect(readHilanMonth()).toEqual({ month: 4, year: null });
  });

  it("prefers the month-picker label over the expanded date cells", () => {
    const label = document.createElement("span");
    label.id = "ctl00_mp_calendar_monthChanged";
    label.textContent = "מאי 2026";
    document.body.appendChild(label);
    expect(readHilanMonth()).toEqual({ month: 5, year: 2026 });
  });
});

describe("copyTimesheetData", () => {
  it("stores NBSP-separated Hilan dates under the normalized Malam date key", async () => {
    await copyTimesheetData();

    const year = new Date().getFullYear();
    const timesheetData = stored.timesheetData as TimesheetData;

    expect(Object.keys(timesheetData)).toContain(`03/04/${year}`);
    expect(timesheetData[`03/04/${year}`]).toMatchObject({
      entryTime: "08:00",
      exitTime: "18:00",
      originalHilanDate: "03/04",
    });
  });
});

describe("autoClickThenCopy", () => {
  it("waits for copied rows to stabilize after Hilan fills fields asynchronously", async () => {
    document.body.innerHTML = `<table><tbody>
      <tr><td id="clicker" class="cDIES" title="08:00"></td></tr>
      <tr>${dateCell("a", "03/04 יום ג")}${dataCells("a", "", "", "", '<option value="0" selected>x</option>')}</tr>
      <tr>${dateCell("b", "04/04 יום ד")}${dataCells("b", "", "", "", '<option value="0" selected>x</option>')}</tr>
    </tbody></table>`;
    for (const sel of document.querySelectorAll("select")) {
      const i = Array.from(sel.options).findIndex(o => o.hasAttribute("selected"));
      sel.selectedIndex = i >= 0 ? i : 0;
    }
    document.getElementById("clicker")?.addEventListener("dblclick", () => {
      setTimeout(() => {
        document.querySelector('[id*="cellOf_ManualEntry_EmployeeReports_a"]')?.setAttribute("ov", "08:00");
        document.querySelector('[id*="cellOf_ManualExit_EmployeeReports_a"]')?.setAttribute("ov", "16:00");
      }, 100);
      setTimeout(() => {
        document.querySelector('[id*="cellOf_ManualEntry_EmployeeReports_b"]')?.setAttribute("ov", "09:00");
        document.querySelector('[id*="cellOf_ManualExit_EmployeeReports_b"]')?.setAttribute("ov", "17:00");
      }, 700);
    });

    await expect(autoClickThenCopy()).resolves.toEqual({ count: 2 });
  });
});
