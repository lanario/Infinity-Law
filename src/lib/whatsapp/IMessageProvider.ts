export interface SendParams {
  to: string;      // E.164 format: +5511999999999
  body: string;
  metadata?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  url?: string;
  messageId?: string;
  error?: string;
}

export interface IMessageProvider {
  send(params: SendParams): Promise<SendResult>;
}
