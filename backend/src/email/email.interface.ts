export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TransactionalEmailProvider {
  readonly name: string;
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>;
}
