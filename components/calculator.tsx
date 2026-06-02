import { useI18n } from "@/lib/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { CalculatorResult } from "@/lib/types";

const currency = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clock = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const payHours = (pay: number, hours: number) => `₪${currency(pay)} (${clock(hours)}h)`;
const payDays = (pay: number, days: number) => `₪${currency(pay)} (${days.toFixed(1)}d)`;

export function Calculator({
  rate,
  onRateChange,
  onCalculate,
  result,
  canCalculate,
}: {
  rate: string;
  onRateChange: (value: string) => void;
  onCalculate: () => void;
  result: CalculatorResult | null;
  canCalculate: boolean;
}) {
  const { t, dir } = useI18n();

  const breakdown = result
    ? [
        { label: t.resultRegular, value: payHours(result.regularPay, result.regularHours) },
        { label: t.resultNight, value: payHours(result.nightPay, result.nightHours) },
        { label: t.resultWorkDays, value: payDays(result.workDaysPay, result.workDays) },
        { label: t.resultVacation, value: payDays(result.vacationPay, result.vacationDays) },
        { label: t.resultTravel, value: payDays(result.travelRefund, result.workDays) },
        { label: t.resultMeal, value: payDays(result.mealRefund, result.mealEligibleDays) },
        { label: t.resultOvertime125, value: payHours(result.overtime125Pay, result.overtime125Hours) },
        { label: t.resultOvertime150, value: payHours(result.overtime150Pay, result.overtime150Hours) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <InputGroup dir="ltr" className="flex-1">
          <InputGroupInput
            type="number"
            inputMode="decimal"
            min={1}
            step={1}
            value={rate}
            placeholder="0"
            aria-label={t.hourlyRate}
            onChange={event => onRateChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && canCalculate) onCalculate();
            }}
          />
          <InputGroupAddon align="inline-end">₪</InputGroupAddon>
        </InputGroup>
        <Button size="sm" disabled={!canCalculate} onClick={onCalculate}>
          {t.calculate}
        </Button>
      </div>

      {result ? (
        <div className="flex flex-col gap-1.5 rounded-md border bg-card p-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t.resultTotalPay}</span>
            <span dir="ltr" className="text-sm font-semibold tabular-nums">
              {payHours(result.totalPay, result.regularHours + result.nightHours)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {breakdown.map(item => (
              <div key={item.label} className="flex flex-col rounded-md bg-muted/60 px-2 py-1 leading-tight">
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                <span
                  dir="ltr"
                  className={cn("text-xs font-medium tabular-nums", dir === "rtl" ? "text-right" : "text-left")}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground tabular-nums">
            {result.periodStart} – {result.periodEnd}
          </p>
        </div>
      ) : null}
    </div>
  );
}
