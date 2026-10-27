import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPortal } from "@/components/auth/auth-portal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar Conta | Infinity Law",
  description: "Crie a conta do seu escritório de advocacia no Infinity Law.",
};

export default async function SignupPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <AuthPortal inicial="cadastrar" />;
}
