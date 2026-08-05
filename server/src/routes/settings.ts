import { Router } from 'express';
import { ABOUT_ME_MAX_WORDS, countWords, isAiModelId } from '@career-intelligence/shared';
import { Settings } from '../models';
import { config } from '../config';
import { getGmailAuthUrl, handleGmailCallback } from '../services/mail/gmailService';
import { getOutlookAuthUrl, handleOutlookCallback } from '../services/mail/outlookService';
import { getEmailStatus, disconnectEmail } from '../services/mail/mailService';

const router = Router();

function sanitizeSettings(settings: Record<string, unknown>) {
  const copy = JSON.parse(JSON.stringify(settings));
  if (copy.emailIntegration) {
    delete copy.emailIntegration.accessToken;
    delete copy.emailIntegration.refreshToken;
    delete copy.emailIntegration.tokenExpiresAt;
  }
  return copy;
}

router.get('/', async (_req, res) => {
  let settings = await Settings.findById('app');
  if (!settings) {
    settings = await Settings.create({ _id: 'app' });
  }
  res.json(sanitizeSettings(settings.toObject()));
});

router.put('/', async (req, res) => {
  const { emailIntegration, ...rest } = req.body;
  const update: Record<string, unknown> = { ...rest };
  if (typeof update.aboutMe === 'string') {
    if (countWords(update.aboutMe) > ABOUT_ME_MAX_WORDS) {
      return res.status(400).json({
        error: `"Om mig" må højst være ${ABOUT_ME_MAX_WORDS} ord`,
      });
    }
  }
  const preferences = update.preferences as { aiModel?: string } | undefined;
  if (preferences?.aiModel != null && !isAiModelId(preferences.aiModel)) {
    return res.status(400).json({ error: `Ukendt AI-model: ${preferences.aiModel}` });
  }
  if (emailIntegration && !emailIntegration.accessToken) {
    update.emailIntegration = emailIntegration;
  }
  const settings = await Settings.findByIdAndUpdate('app', { $set: update }, { upsert: true, new: true });
  res.json(sanitizeSettings(settings!.toObject()));
});

router.get('/email/status', async (_req, res) => {
  const status = await getEmailStatus();
  res.json(status);
});

router.get('/email/connect/:provider', (req, res) => {
  try {
    const url =
      req.params.provider === 'google' || req.params.provider === 'gmail'
        ? getGmailAuthUrl()
        : getOutlookAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.redirect(`${config.clientUrl}/settings?emailError=${encodeURIComponent(err instanceof Error ? err.message : 'Fejl')}`);
  }
});

router.get('/email/callback/google', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) throw new Error('Ingen autorisationskode');
    await handleGmailCallback(code);
    res.redirect(`${config.clientUrl}/settings?emailConnected=gmail`);
  } catch (err) {
    res.redirect(
      `${config.clientUrl}/settings?emailError=${encodeURIComponent(err instanceof Error ? err.message : 'Gmail fejl')}`
    );
  }
});

router.get('/email/callback/microsoft', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) throw new Error('Ingen autorisationskode');
    await handleOutlookCallback(code);
    res.redirect(`${config.clientUrl}/settings?emailConnected=outlook`);
  } catch (err) {
    res.redirect(
      `${config.clientUrl}/settings?emailError=${encodeURIComponent(err instanceof Error ? err.message : 'Outlook fejl')}`
    );
  }
});

router.delete('/email/disconnect', async (_req, res) => {
  await disconnectEmail();
  res.json({ success: true });
});

export default router;
