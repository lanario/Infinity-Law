"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Camera, ImagePlus, Loader2, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80";

export interface TelegramHeaderProps {
  avatar: string;
  name: string;
  phone: string;
  username: string;
  roleBadge?: string;
  initials?: string;
  uploading?: boolean;
  actionButton?: {
    text: string;
    onClick: () => void;
    backgroundColor?: string;
  };
  className?: string;
}

export function TelegramHeader({
  avatar,
  name,
  phone,
  username,
  roleBadge,
  initials,
  uploading = false,
  actionButton,
  className,
}: TelegramHeaderProps) {
  const [expand, setExpand] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatar]);

  const resolvedAvatar = !imageError && avatar?.trim() ? avatar : FALLBACK_AVATAR;

  return (
    <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
      <div
        className={cn(
          "relative rounded-[24px] overflow-hidden bg-gradient-to-b from-[#FBF6E9]/80 via-[#F8F8F7] to-white dark:from-zinc-800/90 dark:via-zinc-900 dark:to-zinc-900 border border-stone-200/80 dark:border-zinc-800 shadow-[0_8px_30px_-16px_rgba(23,25,26,0.12)] font-sans",
          className,
        )}
      >
        <AnimatePresence>
          {expand && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={() => setExpand(false)}
              className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white/95 backdrop-blur-md border border-white/15 hover:bg-black/60 transition-colors cursor-pointer"
              aria-label="Clique para recolher foto"
            >
              <Minimize2 className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
              <span>Clique para recolher</span>
            </motion.button>
          )}
        </AnimatePresence>

        {actionButton && (
          <motion.button
            type="button"
            layout
            initial={false}
            style={
              expand && actionButton.backgroundColor
                ? { backgroundColor: actionButton.backgroundColor }
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              actionButton.onClick();
            }}
            disabled={uploading}
            className={cn(
              "absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-60",
              expand
                ? "bg-[#D4AF37] text-[#17191A] backdrop-blur-md shadow-md border border-white/25 hover:brightness-105"
                : "bg-white/90 text-[#17191A] border border-stone-200/90 hover:border-[#D4AF37] shadow-sm dark:bg-zinc-800/90 dark:text-zinc-100 dark:border-zinc-700 dark:hover:border-[#D4AF37]",
            )}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" aria-hidden="true" />
            ) : expand ? (
              <Camera className="h-3.5 w-3.5 text-[#17191A]" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
            )}
            <span>{actionButton.text}</span>
          </motion.button>
        )}

        <motion.header
          layout
          className={cn(
            "relative isolate flex flex-col w-full transition-colors",
            expand
              ? "min-h-[280px] sm:min-h-[320px] items-start justify-end p-6 text-left"
              : "py-7 px-5 items-center justify-center text-center",
          )}
        >
          {!expand && (
            <motion.button
              type="button"
              layoutId="user-avatar"
              style={{ borderRadius: 48 }}
              onClick={() => setExpand(true)}
              className="relative w-24 h-24 overflow-hidden ring-4 ring-white dark:ring-zinc-800 shadow-[0_10px_28px_-8px_rgba(23,25,26,0.3)] group cursor-pointer bg-[#17191A] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              aria-label={`Expandir foto de perfil de ${name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedAvatar}
                alt={name || "Foto do perfil"}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {initials && imageError && !resolvedAvatar && (
                <span className="text-lg font-black tracking-wide text-[#D4AF37]">{initials}</span>
              )}
              <span
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors duration-200"
                aria-hidden="true"
              >
                <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
              </span>
            </motion.button>
          )}

          <AnimatePresence>
            {expand && (
              <motion.button
                type="button"
                layoutId="user-avatar"
                style={{ borderRadius: 0 }}
                onClick={() => setExpand(false)}
                className="absolute inset-0 -z-10 w-full h-full overflow-hidden cursor-pointer focus-visible:outline-none"
                aria-label="Recolher foto de perfil em destaque"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedAvatar}
                  alt={name || "Foto do perfil"}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15"
                />
              </motion.button>
            )}
          </AnimatePresence>

          {roleBadge && (
            <motion.div
              layout
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-0.5 rounded-full mt-3 transition-colors",
                expand
                  ? "bg-black/50 text-[#F5D77F] border border-[#D4AF37]/45 backdrop-blur-sm mb-1"
                  : "bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/25 dark:bg-[#D4AF37]/15 dark:text-[#E5C158] dark:border-[#D4AF37]/30",
              )}
            >
              <Sparkles className="h-2.5 w-2.5 text-[#D4AF37]" aria-hidden="true" />
              <span>{roleBadge}</span>
            </motion.div>
          )}

          <motion.h2
            layout
            className={cn(
              "text-xl sm:text-2xl font-black tracking-tight transition-colors",
              expand ? "text-white" : "text-[#17191A] dark:text-zinc-100",
              roleBadge ? "mt-1.5" : "mt-3",
            )}
          >
            {name}
          </motion.h2>

          <motion.div
            layout
            className={cn(
              "flex flex-wrap items-center gap-1.5 text-xs font-normal mt-1 transition-colors",
              expand ? "justify-start text-white/85" : "justify-center text-[#6B7280] dark:text-zinc-400",
            )}
          >
            <p className="tracking-tight tabular-nums">{phone}</p>
            <span aria-hidden="true">•</span>
            <p className="truncate max-w-[260px]">{username}</p>
          </motion.div>
        </motion.header>
      </div>
    </MotionConfig>
  );
}

export default TelegramHeader;
