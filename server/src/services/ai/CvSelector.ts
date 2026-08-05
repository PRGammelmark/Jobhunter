import { CvTemplate } from '../../models';
import type { AiAnalysis } from '@career-intelligence/shared';

export class CvSelector {
  async select(jobRequirements: string[], analysis?: AiAnalysis): Promise<{ templateId?: string; reason: string }> {
    const templates = await CvTemplate.find();
    if (templates.length === 0) {
      return { reason: 'Ingen CV-templates uploadet endnu' };
    }

    const reqText = jobRequirements.join(' ').toLowerCase();
    let best = templates[0];
    let bestScore = 0;

    for (const template of templates) {
      let score = template.isDefault ? 10 : 0;
      for (const tag of template.tags) {
        if (reqText.includes(tag.toLowerCase())) score += 20;
      }
      if (score > bestScore) {
        bestScore = score;
        best = template;
      }
    }

    return {
      templateId: best._id.toString(),
      reason: bestScore > 0
        ? `Matcher tags: ${best.tags.join(', ')}`
        : `Standardvalg: ${best.name}`,
    };
  }
}

export const cvSelector = new CvSelector();
