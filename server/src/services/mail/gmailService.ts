import type { Types } from 'mongoose';
import { google } from 'googleapis';
import { config } from '../../config';
import { Settings } from '../../models';
import { encrypt, decrypt } from '../crypto/tokenCrypto';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

export function getGmailAuthUrl(state: string): string {
  if (!config.google.clientId) throw new Error('GOOGLE_CLIENT_ID ikke konfigureret');
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function handleGmailCallback(
  code: string,
  tenantId: Types.ObjectId | string
): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error('Ingen access token modtaget');

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const userInfo = await oauth2.userinfo.get();

  await Settings.findOneAndUpdate(
    { tenantId },
    {
      emailIntegration: {
        provider: 'gmail',
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        connectedEmail: userInfo.data.email || '',
      },
    },
    { upsert: true }
  );
}

async function getAuthenticatedClient(tenantId: Types.ObjectId | string) {
  const settings = await Settings.findOne({ tenantId });
  const integration = settings?.emailIntegration as {
    provider?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  } | undefined;

  if (integration?.provider !== 'gmail' || !integration.accessToken) {
    throw new Error('Gmail ikke forbundet — gå til Indstillinger');
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: decrypt(integration.accessToken),
    refresh_token: integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    expiry_date: integration.tokenExpiresAt?.getTime(),
  });

  if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date() && integration.refreshToken) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await Settings.findOneAndUpdate(
      { tenantId },
      {
        'emailIntegration.accessToken': encrypt(credentials.access_token!),
        'emailIntegration.tokenExpiresAt': credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : undefined,
      }
    );
  }

  return client;
}

function buildMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string,
  attachments: Array<{ filename: string; content: Buffer; mimeType: string }>
): string {
  const boundary = `boundary_${Date.now()}`;
  const parts: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ];

  for (const att of attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${att.mimeType}; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      att.content.toString('base64')
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join('\r\n');
}

export async function sendGmailEmail(
  to: string,
  subject: string,
  body: string,
  attachments: Array<{ filename: string; content: Buffer; mimeType: string }>,
  tenantId: Types.ObjectId | string
): Promise<string> {
  const client = await getAuthenticatedClient(tenantId);
  const settings = await Settings.findOne({ tenantId });
  const from =
    (settings?.emailIntegration as { connectedEmail?: string })?.connectedEmail ||
    (settings?.profile as { email?: string })?.email ||
    '';

  const raw = buildMimeMessage(from, to, subject, body, attachments);
  const encoded = Buffer.from(raw).toString('base64url');

  const gmail = google.gmail({ version: 'v1', auth: client });
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  return result.data.id || 'sent';
}
