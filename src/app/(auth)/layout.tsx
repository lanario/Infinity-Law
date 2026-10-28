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
    <div className="min-h-screen bg-[#F7F6F1] text-[#17191A] antialiased selection:bg-[#D4AF37]/30 selection:text-[#17191A]">
      {children}
    </div>
  );
}
