import { ExternalLink, Keyboard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeControl } from "@/components/theme-control";
import { LanguageControl } from "@/components/language-control";
import { StatusLine, type Status } from "@/components/status-line";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LanguagePref, ThemePref } from "@/lib/types";

const REPO_URL = "https://github.com/IIMrRobotII/Timesheet-Helper";
const PRIVACY_URL = "https://iimrrobotii.github.io/Timesheet-Helper/privacy/";

export function SettingsView({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  onClearData,
  onOpenShortcuts,
  status,
}: {
  theme: ThemePref;
  onThemeChange: (next: ThemePref) => void;
  language: LanguagePref;
  onLanguageChange: (next: LanguagePref) => void;
  onClearData: () => void;
  onOpenShortcuts: () => void;
  status: Status;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{t.appearance}</h2>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t.theme}</span>
          <ThemeControl value={theme} onChange={onThemeChange} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t.language}</span>
          <LanguageControl value={language} onChange={onLanguageChange} />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{t.keyboardShortcuts}</h2>
        <p className="text-xs text-muted-foreground">{t.shortcutsHint}</p>
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={onOpenShortcuts}>
          <Keyboard />
          {t.customizeShortcuts}
        </Button>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{t.support}</h2>
        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {t.viewOnGitHub}
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {t.privacyPolicy}
          </a>
        </Button>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{t.dataManagement}</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
              {t.clearAllData}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{t.modalTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.modalMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.modalCancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onClearData}>
                {t.modalConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <StatusLine status={status} />
      </section>

      <p className="pt-1 text-center text-[10px] text-muted-foreground">{t.footerMadeBy}</p>
    </div>
  );
}
