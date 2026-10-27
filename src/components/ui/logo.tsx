import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div className={cn("relative shrink-0", iconSizes[size])}>
        <Image
          src="/logo.png"
          alt="Infinity Law"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span
          className={cn(
            "font-serif font-bold tracking-tight text-[#F5F5F5] leading-none",
            textSizes[size]
          )}
        >
          Infinity <span className="text-[#D4AF37]">Law</span>
        </span>
      )}
    </div>
  );
}
