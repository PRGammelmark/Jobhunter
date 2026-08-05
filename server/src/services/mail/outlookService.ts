import type { Types } from 'mongoose';
import { config } from '../../config';
import { Settings } from '../../models';
import { encrypt, decrypt } from '../crypto/tokenCrypto';

const SCOPES = ['https://graph.microsoft.com/Mail.Send', 'offline_access', 'User.Read'];

export function getOutlookAuthUrl(state: string): string {
  if (!config.microsoft.clientId) throw new Error('MICROSOFT_CLIENT_ID ikke konfigureret');
  const params = new URLSearchParams({
    client_id: config.microsoft.clientId,
    response_type: 'code',
    redirect_uri: config.microsoft.redirectUri,
    scope: SCOPES.join(' '),
    response_mode: 'query',
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function handleOutlookCallback(
  code: string,
  tenantId: Types.ObjectId | string
): Promise<void> {
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      code,
      redirect_uri: config.microsoft.redirectUri,
      grant_type: 'authorization_code',
      scope: SCOPES.join(' '),
    }),
  });

  if (!tokenRes.ok) throw new Error('Outlook token exchange fejlede');
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = (await profileRes.json()) as { mail?: string; userPrincipalName?: string };

  await Settings.findOneAndUpdate(
    { tenantId },
    {
      emailIntegration: {
        provider: 'outlook',
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
        connectedEmail: profile.mail || profile.userPrincipalName || '',
      },
    },
    { upsert: true }
  );
}

async function getAccessToken(tenantId: Types.ObjectId | string): Promise<string> {
  const settings = await Settings.findOne({ tenantId });
  const integration = settings?.emailIntegration as {
    provider?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  } | undefined;

  if (integration?.provider !== 'outlook' || !integration.accessToken) {
    throw new Error('Outlook ikke forbundet — gå til Indstillinger');
  }

  if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date() && integration.refreshToken) {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.microsoft.clientId,
        client_secret: config.microsoft.clientSecret,
        refresh_token: decrypt(integration.refreshToken),
        grant_type: 'refresh_token',
        scope: SCOPES.join(' '),
      }),
    });

    if (!tokenRes.ok) throw new Error('Kunne ikke forny Outlook-token');
    const tokens = (await tokenRes.json()) as { access_token: string; expires_in?: number };

    await Settings.findOneAndUpdate(
      { tenantId },
      {
        'emailIntegration.accessToken': encrypt(tokens.access_token),
        'emailIntegration.tokenExpiresAt': tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
      }
    );

    return tokens.access_token;
  }

  return decrypt(integration.accessToken);
}

export async function sendOutlookEmail(
  to: string,
  subject: string,
  body: string,
  attachments: Array<{ filename: string; content: Buffer; mimeType: string }>,
  tenantId: Types.ObjectId | string
): Promise<string> {
  const accessToken = await getAccessToken(tenantId);

  const message = {
    message: {
      subject,
      body: { contentType: 'Text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
      attachments: attachments.map((att) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.mimeType,
        contentBytes: att.content.toString('base64'),
      })),
    },
    saveToSentItems: true,
  };

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Outlook send fejlede: ${err}`);
  }

  return 'sent';
}
