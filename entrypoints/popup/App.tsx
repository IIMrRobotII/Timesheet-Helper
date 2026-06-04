import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCopy, ClipboardPaste, MousePointerClick, RefreshCw, Settings, Zap } from "lucide-react";
import { Direction } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { Calculator } from "@/components/calculator";
import { SettingsView } from "@/components/settings-view";
import { StatusLine, type Status } from "@/components/status-line";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useTheme } from "@/lib/use-theme";
import { detectSite, SYNC_COMMAND } from "@/lib/sites";
import { isValidHourlyRate } from "@/lib/calc";
import { clearSettings, getSettings, setSettings } from "@/lib/storage";
import { activeTabUrl, sendToActiveTab } from "@/lib/messaging";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/messages";
import type {
  CalculatorResult,
  ExtensionAction,
  ExtensionErrorCode,
  FullSyncRequest,
  FullSyncResult,
  UIContext,
} from "@/lib/types";

type View = "main" | "settings";

const ERROR_TEXT: Record<ExtensionErrorCode, (t: Messages) => string> = {
  EXT_DISABLED: t => t.errorExtensionDisabled,
  WRONG_SITE: t => t.errorWrongSite,
  NO_DATA: t => t.errorNoData,
  OPERATION_IN_PROGRESS: t => t.errorInProgress,
  NO_TIME_BOXES: t => t.errorNoTimeBoxes,
  COPY_FAILED: t => t.errorNoData,
  PASTE_FAILED: t => t.errorNoData,
  INVALID_ACTION: t => t.errorUnknownAction,
  INVALID_RATE: t => t.errorEnterHourlyRate,
  UNEXPECTED_ERROR: t => t.errorOperationFailed,
  NO_HILAN_TAB: t => t.errorNoHilanTab,
  HILAN_MONTH_UNREADABLE: t => t.errorHilanMonthUnreadable,
  MALAM_MONTH_UNREADABLE: t => t.errorMalamMonthUnreadable,
  MONTH_MISMATCH: t => t.errorMonthMismatch,
};

function contextFromUrl(url: string): UIContext {
  const site = detectSite(url);
  if (site?.name === "HILAN") return { id: "hilanTimesheet", kind: "source", primaryAction: "copy" };
  if (site?.name === "MALAM") return { id: "malam", kind: "target", primaryAction: "paste" };
  if (url.toLowerCase().includes("hilan.co.il")) return { id: "hilan", kind: "source", primaryAction: "copy" };
  return { id: "unknown", kind: "unknown", primaryAction: "copy" };
}

const formatShortcut = (shortcut: string) => shortcut.split("+").join(" + ");

export default function App() {
  const { t, lang, setLang, dir } = useI18n();
  const { theme, setTheme, resetTheme } = useTheme();

  const [view, setView] = useState<View>("main");
  const [context, setContext] = useState<UIContext>({ id: "unknown", kind: "unknown", primaryAction: "copy" });
  const [enabled, setEnabled] = useState(true);
  const [calculatorEnabled, setCalculatorEnabled] = useState(false);
  const [rate, setRate] = useState("");
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const [settings, url, commands] = await Promise.all([
        getSettings(),
        activeTabUrl(),
        chrome.commands.getAll().catch(() => [] as chrome.commands.Command[]),
      ]);
      if (!active) return;
      setEnabled(settings.extensionEnabled);
      setCalculatorEnabled(settings.calculatorEnabled);
      if (settings.hourlyRate > 0) setRate(String(settings.hourlyRate));
      setContext(contextFromUrl(url));
      const map: Record<string, string> = {};
      for (const command of commands) if (command.name && command.shortcut) map[command.name] = command.shortcut;
      setShortcuts(map);
    })();
    return () => {
      active = false;
    };
  }, []);

  const isHilanTimesheet = context.id === "hilanTimesheet";
  const dotActive = enabled && (context.id === "hilanTimesheet" || context.id === "malam");
  const canAutoClick = enabled && isHilanTimesheet && !busy;
  const canPrimary = enabled && !busy && context.kind !== "unknown" && context.id !== "hilan";
  const canCalculate = enabled && isHilanTimesheet && !busy && isValidHourlyRate(Number(rate));
  const guidance =
    context.kind === "source" ? t.guidanceSource : context.kind === "target" ? t.guidanceTarget : t.guidanceDefault;
  const primaryLabel = context.kind === "source" ? t.copyHours : context.kind === "target" ? t.pasteHours : t.syncHours;
  const PrimaryIcon =
    context.kind === "source" ? ClipboardCopy : context.kind === "target" ? ClipboardPaste : RefreshCw;
  const autoClickShortcut = shortcuts["auto-click"];
  const primaryShortcut =
    context.kind === "source"
      ? shortcuts["copy-hours"]
      : context.kind === "target"
        ? shortcuts["paste-hours"]
        : undefined;
  const syncShortcut = shortcuts[SYNC_COMMAND];
  const showSync = context.kind !== "unknown" && context.id !== "hilan";
  const canSync = enabled && !busy && showSync;

  const errorText = (code: ExtensionErrorCode) => ERROR_TEXT[code]?.(t) ?? t.errorOperationFailed;

  const failFromException = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("COMMUNICATION_TIMEOUT")) return t.errorOperationTimedOut;
    if (message.includes("establish connection") || message.includes("Receiving end")) return t.errorCommunicationIssue;
    return t.errorOperationFailed;
  };

  const toggleExtension = (next: boolean) => {
    setEnabled(next);
    setStatus({ kind: "idle" });
    void setSettings({ extensionEnabled: next }).catch(() => {});
  };

  const toggleCalculator = (next: boolean) => {
    setCalculatorEnabled(next);
    void setSettings({ calculatorEnabled: next }).catch(() => {});
  };

  const changeRate = (value: string) => {
    setRate(value);
    const parsed = Number(value);
    if (isValidHourlyRate(parsed)) void setSettings({ hourlyRate: parsed }).catch(() => {});
  };

  const runOperation = async (
    action: Extract<ExtensionAction, "autoClickTimeBoxes" | "copyHours">,
    working: string
  ) => {
    setBusy(true);
    setStatus({ kind: "working", text: working });
    try {
      const response = await sendToActiveTab({ action });
      if (response.success) {
        if (response.action === "autoClickTimeBoxes") {
          setStatus({
            kind: "success",
            text:
              response.totalBoxes === 0 && response.alreadyClicked > 0
                ? t.successAlreadyClicked
                : t.successAutoClick(response.clickedCount, response.totalBoxes),
          });
        } else if (response.action === "copyHours") {
          setStatus({
            kind: "success",
            text: context.kind === "source" ? t.successCopied(response.count) : t.successPasted(response.count),
          });
        } else {
          setStatus({ kind: "error", text: t.errorOperationFailed });
        }
      } else {
        setStatus({ kind: "error", text: errorText(response.error.code) });
      }
    } catch (error) {
      setStatus({ kind: "error", text: failFromException(error) });
    } finally {
      setBusy(false);
    }
  };

  const syncEverything = async () => {
    setBusy(true);
    setStatus({ kind: "working", text: t.workingSyncing });
    try {
      const result = (await chrome.runtime.sendMessage({
        kind: "fullSync",
      } satisfies FullSyncRequest)) as FullSyncResult;
      if (result.status === "synced")
        setStatus({ kind: "success", text: t.successSynced(result.copied, result.pasted) });
      else if (result.status === "copiedNoMalam") setStatus({ kind: "info", text: t.syncNoMalam(result.copied) });
      else setStatus({ kind: "error", text: errorText(result.code) });
    } catch (error) {
      setStatus({ kind: "error", text: failFromException(error) });
    } finally {
      setBusy(false);
    }
  };

  const calculate = async () => {
    const parsed = Number(rate);
    if (!isValidHourlyRate(parsed)) {
      setStatus({ kind: "error", text: t.errorEnterHourlyRate });
      return;
    }
    setBusy(true);
    setStatus({ kind: "working", text: t.workingCalculating });
    try {
      const response = await sendToActiveTab({ action: "calculateSalary", hourlyRate: parsed });
      if (response.success && response.action === "calculateSalary") {
        setResult(response.calculatorResult);
        setStatus({ kind: "success", text: t.successCalculated });
        void setSettings({ hourlyRate: parsed }).catch(() => {});
      } else {
        const code = response.success ? "" : response.error.code;
        setStatus({ kind: "error", text: code === "NO_DATA" ? t.errorNoTimesheetData : t.errorOperationFailed });
      }
    } catch (error) {
      setStatus({ kind: "error", text: failFromException(error) });
    } finally {
      setBusy(false);
    }
  };

  const clearData = async () => {
    setStatus({ kind: "working", text: t.workingClearing });
    try {
      await clearSettings();
      setEnabled(true);
      setCalculatorEnabled(true);
      setRate("");
      setResult(null);
      setLang("system");
      resetTheme();
      setContext(contextFromUrl(await activeTabUrl()));
      setStatus({ kind: "success", text: t.successCleared });
    } catch {
      setStatus({ kind: "error", text: t.errorClearDataFailed });
    }
  };

  return (
    <Direction.Provider dir={dir}>
      <main className="flex w-88 flex-col gap-2.5 p-4 pb-5 text-foreground">
        <header className="flex items-center gap-2">
          {view === "settings" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.pageTitle}
              onClick={() => {
                setStatus({ kind: "idle" });
                setView("main");
              }}
            >
              <ArrowLeft />
            </Button>
          ) : (
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", dotActive ? "bg-indicator-active" : "bg-indicator-disabled")}
            />
          )}
          <h1 className="text-sm font-semibold">{view === "settings" ? t.settings : t.pageTitle}</h1>
          {view === "main" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="ms-auto"
              aria-label={t.settings}
              onClick={() => {
                setStatus({ kind: "idle" });
                setView("settings");
              }}
            >
              <Settings />
            </Button>
          ) : null}
        </header>

        {view === "settings" ? (
          <SettingsView
            theme={theme}
            onThemeChange={setTheme}
            language={lang}
            onLanguageChange={setLang}
            onClearData={() => void clearData()}
            onOpenShortcuts={() => void chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
            status={status}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="extension-toggle" className="font-normal">
                {enabled ? t.extensionEnabled : t.extensionDisabled}
              </Label>
              <Switch id="extension-toggle" checked={enabled} onCheckedChange={toggleExtension} />
            </div>

            {enabled ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs leading-snug text-muted-foreground">{guidance}</p>

                {showSync ? (
                  <Button
                    size="sm"
                    className="w-full justify-start"
                    disabled={!canSync}
                    onClick={() => void syncEverything()}
                  >
                    <Zap />
                    {t.syncEverything}
                    {syncShortcut ? <Kbd className="ms-auto">{formatShortcut(syncShortcut)}</Kbd> : null}
                  </Button>
                ) : null}

                {isHilanTimesheet ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={!canAutoClick}
                    onClick={() => void runOperation("autoClickTimeBoxes", t.workingAutoClick)}
                  >
                    <MousePointerClick />
                    {t.autoClick}
                    {autoClickShortcut ? <Kbd className="ms-auto">{formatShortcut(autoClickShortcut)}</Kbd> : null}
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={!canPrimary}
                  onClick={() =>
                    void runOperation("copyHours", context.kind === "source" ? t.workingCopying : t.workingPasting)
                  }
                >
                  <PrimaryIcon />
                  {primaryLabel}
                  {primaryShortcut ? <Kbd className="ms-auto">{formatShortcut(primaryShortcut)}</Kbd> : null}
                </Button>

                <StatusLine status={status} />

                <Separator />

                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="calculator-toggle" className="font-normal">
                    {t.salaryCalculator}
                  </Label>
                  <Switch id="calculator-toggle" checked={calculatorEnabled} onCheckedChange={toggleCalculator} />
                </div>

                {calculatorEnabled ? (
                  <Calculator
                    rate={rate}
                    onRateChange={changeRate}
                    onCalculate={() => void calculate()}
                    result={result}
                    canCalculate={canCalculate}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </Direction.Provider>
  );
}
