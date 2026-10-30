import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-stone-200/75 dark:bg-zinc-800/70",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 dark:before:via-white/5 before:to-transparent",
        "motion-reduce:before:hidden motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
