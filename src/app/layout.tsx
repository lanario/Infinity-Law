import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Infinity Law — Sistema de Gestão Jurídica",
    template: "%s | Infinity Law",
  },
  description: "Sistema de gestão jurídica multi-tenant para escritórios de advocacia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans", inter.variable, inter.className)}>
      <body className={cn(inter.variable, inter.className, "font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
