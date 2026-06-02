import { Monitor, Moon, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { ThemePref } from "@/lib/types";

const isTheme = (value: string): value is ThemePref => value === "system" || value === "light" || value === "dark";

export function ThemeControl({ value, onChange }: { value: ThemePref; onChange: (next: ThemePref) => void }) {
  const { t } = useI18n();
  const options = [
    { value: "system", label: t.themeSystem, Icon: Monitor },
    { value: "light", label: t.themeLight, Icon: Sun },
    { value: "dark", label: t.themeDark, Icon: Moon },
  ] as const;

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={next => isTheme(next) && onChange(next)}
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
