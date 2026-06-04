import type { LanguagePref, StorageSchema, ThemePref, TimesheetData } from "./types";

export const DEFAULTS: StorageSchema = {
  extensionEnabled: true,
  calculatorEnabled: true,
  currentLanguage: "system",
  currentTheme: "system",
  timesheetData: {},
  hourlyRate: 0,
};

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isLanguage = (v: unknown): v is LanguagePref => v === "system" || v === "en" || v === "he";
const isTheme = (v: unknown): v is ThemePref => v === "system" || v === "light" || v === "dark";
const isRate = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isData = (v: unknown): v is TimesheetData => typeof v === "object" && v !== null && !Array.isArray(v);

const VALIDATORS = {
  extensionEnabled: isBool,
  calculatorEnabled: isBool,
  currentLanguage: isLanguage,
  currentTheme: isTheme,
  timesheetData: isData,
  hourlyRate: isRate,
} satisfies { [K in keyof StorageSchema]: (v: unknown) => v is StorageSchema[K] };

const KEYS = Object.keys(VALIDATORS) as (keyof StorageSchema)[];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isValidStorage = (value: unknown): value is StorageSchema =>
  isRecord(value) && KEYS.every(k => VALIDATORS[k](value[k]));

export async function getSettings(): Promise<StorageSchema> {
  try {
    const stored = await chrome.storage.local.get(KEYS);
    const merged = { ...DEFAULTS, ...stored };
    return isValidStorage(merged) ? merged : structuredClone(DEFAULTS);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export async function setSettings(values: Partial<StorageSchema>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    const validate = VALIDATORS[key as keyof StorageSchema];
    if (!validate || !validate(value)) throw new Error(`Invalid storage value for "${key}"`);
  }
  await chrome.storage.local.set(values);
}

export async function clearSettings(): Promise<void> {
  await chrome.storage.local.clear();
}
