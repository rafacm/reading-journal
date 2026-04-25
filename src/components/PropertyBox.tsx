import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PropertyBoxProps {
  title?: string;
  className?: string;
  titleClassName?: string;
  children: ReactNode;
}

export default function PropertyBox({ title, className, titleClassName, children }: PropertyBoxProps) {
  return (
    <div className={cn("rounded-md border bg-background/80 px-2 py-1.5", className)}>
      {title ? (
        <p className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", titleClassName)}>{title}</p>
      ) : null}
      {children}
    </div>
  );
}
