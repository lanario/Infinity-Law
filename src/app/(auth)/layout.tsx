import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Infinity Law",
    default: "Infinity Law - Sistema Jurídico",
  },
  description: "Sistema completo de gestão para escritórios de advocacia.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] antialiased selection:bg-[#D4AF37]/30 selection:text-[#F5F5F5]">
      {children}
    </div>
  );
}
