import type { IMessageProvider, SendParams, SendResult } from "./IMessageProvider";

// Implementação via link wa.me — não exige API Key, custo zero
// Para trocar por WhatsApp Business API: implementar nova classe com a mesma interface
// e substituir no construtor de src/app/api/whatsapp/send/route.ts
export class LinkWhatsAppProvider implements IMessageProvider {
  async send(params: SendParams): Promise<SendResult> {
    const digits = params.to.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(params.body)}`;

    return {
      success: true,
      url,
    };
  }
}
