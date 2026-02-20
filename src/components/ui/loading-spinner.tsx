import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600",
        className
      )}
    />
  );
}
