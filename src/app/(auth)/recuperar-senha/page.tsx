import type { Metadata } from "next";
import { PasswordRecoveryComplete } from "@/components/auth/password-recovery";

export const metadata: Metadata = {
  title: "Criar nova senha | Infinity Law",
  description: "Defina uma nova senha para acessar sua conta Infinity Law.",
};

export default function RecoverPasswordPage() {
  return <PasswordRecoveryComplete />;
}
