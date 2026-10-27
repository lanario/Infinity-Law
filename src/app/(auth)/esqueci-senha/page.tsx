import type { Metadata } from "next";
import { PasswordRecoveryRequest } from "@/components/auth/password-recovery";

export const metadata: Metadata = {
  title: "Recuperar senha | Infinity Law",
  description: "Solicite um link para recuperar o acesso à sua conta Infinity Law.",
};

export default function ForgotPasswordPage() {
  return <PasswordRecoveryRequest />;
}
