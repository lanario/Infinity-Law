"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ShieldCheck } from "lucide-react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      "response-field": boolean;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileField({
  action,
  onTokenChange,
  resetKey,
}: {
  action: "login" | "signup" | "invite" | "password_reset";
  onTokenChange: (token: string | null) => void;
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Fallback Mock para ambiente local de desenvolvimento quando siteKey não estiver definida
  useEffect(() => {
    if (!siteKey) {
      // Dispara token mock funcional após breve delay para simular verificação
      const timer = setTimeout(() => {
        onTokenChange("dev-mock-turnstile-token");
      }, 150);
      return () => {
        clearTimeout(timer);
        onTokenChange(null);
      };
    }
  }, [action, onTokenChange, resetKey]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const widgetId = api.render(container.current, {
      sitekey: siteKey,
      action,
      "response-field": false,
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    });
    return () => {
      onTokenChange(null);
      api.remove(widgetId);
    };
  }, [action, onTokenChange, resetKey, scriptReady]);

  if (!siteKey) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#161616] px-3.5 py-2 text-xs text-[#A3A3A3]"
        aria-label="Verificação de segurança em desenvolvimento"
      >
        <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
        <span>Verificação de segurança ativa (Modo Dev)</span>
      </div>
    );
  }

  return (
    <div className="min-h-0" aria-label="Verificação de segurança">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={container} />
    </div>
  );
}
