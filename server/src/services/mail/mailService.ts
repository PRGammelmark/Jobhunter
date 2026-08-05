import { Settings } from '../../models';
import { sendGmailEmail } from './gmailService';
import { sendOutlookEmail } from './outlookService';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  mimeType: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  attachments: EmailAttachment[]
): Promise<{ messageId: string; provider: string }> {
  const settings = await Settings.findById('app');
  const provider = (settings?.emailIntegration as { provider?: string })?.provider;

  if (!provider) {
    throw new Error('Ingen email-konto forbundet — forbind Gmail eller Outlook i Indstillinger');
  }

  let messageId: string;
  if (provider === 'gmail') {
    messageId = await sendGmailEmail(to, subject, body, attachments);
  } else if (provider === 'outlook') {
    messageId = await sendOutlookEmail(to, subject, body, attachments);
  } else {
    throw new Error(`Ukendt email-provider: ${provider}`);
  }

  return { messageId, provider };
}

export async function getEmailStatus(): Promise<{
  connected: boolean;
  provider: string | null;
  connectedEmail?: string;
}> {
  const settings = await Settings.findById('app');
  const integration = settings?.emailIntegration as {
    provider?: string | null;
    connectedEmail?: string;
  } | undefined;

  return {
    connected: !!integration?.provider && !!integration?.connectedEmail,
    provider: integration?.provider || null,
    connectedEmail: integration?.connectedEmail,
  };
}

export async function disconnectEmail(): Promise<void> {
  await Settings.findByIdAndUpdate('app', {
    emailIntegration: { provider: null },
  });
}
