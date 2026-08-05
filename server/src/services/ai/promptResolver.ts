import type { Types } from 'mongoose';
import {
  composeAiPrompt,
  isAppLanguage,
  resolveCoverLetterPrompt,
  type AppLanguage,
} from '@career-intelligence/shared';
import { Settings } from '../../models';

/** Resolve the editable cover-letter instructions and append a hardcoded context block. */
export async function getCoverLetterPrompt(
  tenantId: Types.ObjectId | string | undefined | null,
  context: string,
  language: AppLanguage = 'da'
): Promise<string> {
  if (!tenantId) {
    return composeAiPrompt(resolveCoverLetterPrompt(undefined, language), context);
  }
  const settings = await Settings.findOne({ tenantId }).lean() as {
    coverLetterPrompt?: string;
    aiPrompts?: { coverLetterGenerate?: string };
    preferences?: { defaultLanguage?: string };
  } | null;
  const resolvedLanguage = isAppLanguage(settings?.preferences?.defaultLanguage)
    ? settings!.preferences!.defaultLanguage
    : language;
  const override =
    settings?.coverLetterPrompt ||
    settings?.aiPrompts?.coverLetterGenerate ||
    undefined;
  return composeAiPrompt(resolveCoverLetterPrompt(override, resolvedLanguage), context);
}

export function renderCoverLetterPrompt(
  override: string | null | undefined,
  context: string,
  language: AppLanguage = 'da'
): string {
  return composeAiPrompt(resolveCoverLetterPrompt(override, language), context);
}
