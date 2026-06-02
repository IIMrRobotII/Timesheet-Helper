import { beforeEach, describe, expect, it } from "vitest";
import { clearSettings, DEFAULTS, getSettings, setSettings } from "./storage";

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (keys: string[]) => {
          const out: Record<string, unknown> = {};
          for (const name of keys) if (name in store) out[name] = store[name];
          return out;
        },
        set: async (values: Record<string, unknown>) => {
          Object.assign(store, values);
        },
        clear: async () => {
          store = {};
        },
      },
    },
  };
});

describe("getSettings", () => {
  it("returns defaults for an empty store", async () => {
    expect(await getSettings()).toEqual(DEFAULTS);
  });

  it("merges stored values over defaults", async () => {
    store.extensionEnabled = false;
    store.hourlyRate = 75;
    store.currentLanguage = "he";

    const settings = await getSettings();

    expect(settings.extensionEnabled).toBe(false);
    expect(settings.hourlyRate).toBe(75);
    expect(settings.currentLanguage).toBe("he");
    expect(settings.currentTheme).toBe("system");
  });

  it("falls back to defaults when a stored value is invalid", async () => {
    store.currentTheme = "blue";
    expect(await getSettings()).toEqual(DEFAULTS);
  });
});

describe("setSettings", () => {
  it("persists a valid partial update", async () => {
    await setSettings({ hourlyRate: 42, currentTheme: "dark" });
    expect(store.hourlyRate).toBe(42);
    expect(store.currentTheme).toBe("dark");
  });

  it("rejects invalid values", async () => {
    await expect(setSettings({ hourlyRate: -5 })).rejects.toThrow();
    await expect(setSettings({ currentLanguage: "fr" as never })).rejects.toThrow();
  });
});

describe("clearSettings", () => {
  it("empties the store so reads return defaults", async () => {
    await setSettings({ hourlyRate: 99 });
    await clearSettings();
    expect(store).toEqual({});
    expect(await getSettings()).toEqual(DEFAULTS);
  });
});
