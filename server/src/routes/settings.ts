import { Router } from 'express';
import {
  ABOUT_ME_MAX_WORDS,
  countWords,
  isAiModelId,
  normalizeCoverLetterPrompt,
  sanitizeCoverLetterPrompt,
} from '@career-intelligence/shared';
import { Settings } from '../models';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { createOAuthState, consumeOAuthState } from '../services/auth/oauthState';
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
  // Migrate legacy aiPrompts.coverLetterGenerate → coverLetterPrompt for the client
  if (!copy.coverLetterPrompt && copy.aiPrompts && typeof copy.aiPrompts === 'object') {
    const legacy = (copy.aiPrompts as Record<string, unknown>).coverLetterGenerate;
    if (typeof legacy === 'string' && legacy.trim()) {
      copy.coverLetterPrompt = normalizeCoverLetterPrompt(legacy);
    }
  }
  delete copy.aiPrompts;
  return copy;
}

function stripClientAuthFields(body: Record<string, unknown>) {
  const { tenantId, platformRole, passwordHash, tokenVersion, status, ...rest } = body;
  return rest;
}

router.get('/email/callback/google', async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    if (!code) throw new Error('Ingen autorisationskode');
    if (!state) throw new Error('Manglende OAuth state');
    const { tenantId } = await consumeOAuthState(state, 'google');
    await handleGmailCallback(code, tenantId);
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
    const state = req.query.state as string;
    if (!code) throw new Error('Ingen autorisationskode');
    if (!state) throw new Error('Manglende OAuth state');
    const { tenantId } = await consumeOAuthState(state, 'microsoft');
    await handleOutlookCallback(code, tenantId);
    res.redirect(`${config.clientUrl}/settings?emailConnected=outlook`);
  } catch (err) {
    res.redirect(
      `${config.clientUrl}/settings?emailError=${encodeURIComponent(err instanceof Error ? err.message : 'Outlook fejl')}`
    );
  }
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  let settings = await Settings.findOne({ tenantId });
  if (!settings) {
    settings = await Settings.create({
      tenantId,
      profile: { name: '', email: '' },
      aboutMe: '',
      emailIntegration: { provider: null },
      preferences: { defaultLanguage: 'da', aiModel: 'gpt-4o-mini' },
    });
  }
  res.json(sanitizeSettings(settings.toObject()));
});

router.put('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = stripClientAuthFields(req.body);
  const { emailIntegration, ...rest } = body as {
    emailIntegration?: { accessToken?: string };
  } & Record<string, unknown>;
  const update: Record<string, unknown> = { ...rest };
  if (typeof update.aboutMe === 'string') {
    if (countWords(update.aboutMe) > ABOUT_ME_MAX_WORDS) {
      return res.status(400).json({
        error: `"Om mig" må højst være ${ABOUT_ME_MAX_WORDS} ord`,
      });
    }
  }
  const preferences = update.preferences as { aiModel?: string; defaultLanguage?: string } | undefined;
  if (preferences?.aiModel != null && !isAiModelId(preferences.aiModel)) {
    return res.status(400).json({ error: `Ukendt AI-model: ${preferences.aiModel}` });
  }
  if (
    preferences?.defaultLanguage != null &&
    preferences.defaultLanguage !== 'da' &&
    preferences.defaultLanguage !== 'en'
  ) {
    return res.status(400).json({ error: `Ukendt sprog: ${preferences.defaultLanguage}` });
  }
  if ('coverLetterPrompt' in update) {
    const sanitized = sanitizeCoverLetterPrompt(update.coverLetterPrompt);
    update.coverLetterPrompt = sanitized || '';
  }
  delete update.aiPrompts;
  if (emailIntegration && !emailIntegration.accessToken) {
    update.emailIntegration = emailIntegration;
  }
  const settings = await Settings.findOneAndUpdate(
    { tenantId },
    { $set: update, $unset: { aiPrompts: 1 } },
    { upsert: true, new: true }
  );
  res.json(sanitizeSettings(settings!.toObject()));
});

router.get('/email/status', async (req, res) => {
  const status = await getEmailStatus(req.user!.tenantId);
  res.json(status);
});

router.get('/email/connect/:provider', async (req, res) => {
  try {
    const provider =
      req.params.provider === 'google' || req.params.provider === 'gmail' ? 'google' : 'microsoft';
    const state = await createOAuthState({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      provider,
    });
    const url = provider === 'google' ? getGmailAuthUrl(state) : getOutlookAuthUrl(state);
    res.redirect(url);
  } catch (err) {
    res.redirect(
      `${config.clientUrl}/settings?emailError=${encodeURIComponent(err instanceof Error ? err.message : 'Fejl')}`
    );
  }
});

router.delete('/email/disconnect', async (req, res) => {
  await disconnectEmail(req.user!.tenantId);
  res.json({ success: true });
});

export default router;
