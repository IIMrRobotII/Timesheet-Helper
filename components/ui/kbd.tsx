import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, children, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    >
      <span dir="ltr">{children}</span>
    </kbd>
  );
}

export { Kbd };
