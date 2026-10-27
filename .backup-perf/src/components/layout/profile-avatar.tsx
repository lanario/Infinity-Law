"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ProfileAvatar({
  path,
  url,
  initials,
  name,
  className,
  imageClassName,
}: {
  path?: string | null;
  url?: string | null;
  initials: string;
  name: string;
  className?: string;
  imageClassName?: string;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setSignedUrl(null);
    if (!path) return;

    let active = true;
    const supabase = createClient();
    const refreshUrl = async () => {
      const { data, error } = await supabase.storage.from("perfis").createSignedUrl(path, 60 * 60);
      if (active && !error) setSignedUrl(data.signedUrl);
    };

    void refreshUrl();
    const interval = window.setInterval(() => void refreshUrl(), 50 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [path]);

  const imageUrl = path ? signedUrl : url;
  const showImage = Boolean(imageUrl && !imageFailed);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17191a] text-xs font-black tracking-wide text-gold",
        className,
      )}
      role="img"
      aria-label={name ? `Foto de ${name}` : "Foto do perfil"}
    >
      {showImage ? (
        // An HTML image is used because profile photos come from a private bucket and signed URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt=""
          onError={() => setImageFailed(true)}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <UserRound className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  );
}
