"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SIGNED_URL_TTL_MS = 50 * 60 * 1000;
// Cache por path compartilhado entre instâncias (Header, UserMenu, etc.).
const signedUrlCache = new Map<string, { url: string; at: number }>();
const signedUrlInflight = new Map<string, Promise<string | null>>();

function getSignedUrl(path: string, force: boolean): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (!force && cached && Date.now() - cached.at < SIGNED_URL_TTL_MS) return Promise.resolve(cached.url);
  const pending = signedUrlInflight.get(path);
  if (pending) return pending;
  const promise = (async () => {
    const { data, error } = await createClient().storage.from("perfis").createSignedUrl(path, 60 * 60);
    if (error) return null;
    signedUrlCache.set(path, { url: data.signedUrl, at: Date.now() });
    return data.signedUrl;
  })().finally(() => signedUrlInflight.delete(path));
  signedUrlInflight.set(path, promise);
  return promise;
}

export function useProfileAvatarUrl(
  path?: string | null,
  url?: string | null,
): {
  imageUrl: string | null;
  imageFailed: boolean;
  markFailed: () => void;
} {
  const [signedUrl, setSignedUrl] = useState<string | null>(() => (path ? signedUrlCache.get(path)?.url ?? null : null));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setSignedUrl(path ? signedUrlCache.get(path)?.url ?? null : null);
    if (!path) return;

    let active = true;
    const refreshUrl = async (force: boolean) => {
      const next = await getSignedUrl(path, force);
      if (active && next) setSignedUrl(next);
    };

    void refreshUrl(false);
    const interval = window.setInterval(() => void refreshUrl(true), SIGNED_URL_TTL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [path]);

  const imageUrl = (path ? signedUrl : url) ?? null;

  return {
    imageUrl,
    imageFailed,
    markFailed: () => setImageFailed(true),
  };
}

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
  const { imageUrl, imageFailed, markFailed } = useProfileAvatarUrl(path, url);
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
          onError={markFailed}
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
