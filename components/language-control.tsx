import { Globe, Monitor } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LanguagePref } from "@/lib/types";

const isLanguage = (value: string): value is LanguagePref => value === "system" || value === "en" || value === "he";

export function LanguageControl({ value, onChange }: { value: LanguagePref; onChange: (next: LanguagePref) => void }) {
  const { t } = useI18n();
  const options = [
    { value: "system", label: t.languageSystem, Icon: Monitor },
    { value: "en", label: "English", Icon: Globe },
    { value: "he", label: "עברית", Icon: Globe },
  ] as const;

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={next => isLanguage(next) && onChange(next)}
      variant="outline"
      size="sm"
      className="w-full"
    >
      {options.map(({ value: option, label, Icon }) => (
        <ToggleGroupItem key={option} value={option} aria-label={label} className="flex-1 gap-1.5">
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
