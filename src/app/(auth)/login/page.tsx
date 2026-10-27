import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPortal } from "@/components/auth/auth-portal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar | Infinity Law",
  description: "Acesse o portal do seu escritório de advocacia no Infinity Law.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { aviso?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <AuthPortal inicial="entrar" avisoInicial={searchParams?.aviso} />;
}
