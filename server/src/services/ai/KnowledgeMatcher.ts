import { normalizeSkillConfidence } from '@career-intelligence/shared';
import type { IKnowledgeEntry } from '../../models';

export interface KnowledgeMatchResult {
  entry: IKnowledgeEntry;
  score: number;
  reason: string;
  relatedEntries: IKnowledgeEntry[];
}

export class KnowledgeMatcher {
  match(jobText: string, entries: IKnowledgeEntry[]): KnowledgeMatchResult[] {
    const lowerJob = jobText.toLowerCase();
    const entryMap = new Map(entries.map((e) => [e._id.toString(), e]));
    const results: KnowledgeMatchResult[] = [];

    for (const entry of entries) {
      const searchTerms = [
        entry.title,
        ...(entry.keywords || []),
      ];

      if (entry.type === 'employment' && entry.employment) {
        searchTerms.push(
          entry.employment.company,
          entry.employment.role,
          ...(entry.employment.responsibilities || [])
        );
      }

      const normalizedTerms = searchTerms
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.toLowerCase());

      let hits = 0;
      for (const term of normalizedTerms) {
        if (lowerJob.includes(term)) hits++;
      }

      const alwaysInclude = entry.type === 'project' || entry.type === 'story' || entry.type === 'employment';
      if (hits === 0 && !alwaysInclude) continue;

      const confidence =
        entry.type === 'skill' ? normalizeSkillConfidence(entry.confidence) : undefined;
      const confidenceWeight = confidence ? confidence / 5 : 1;
      const score = Math.min(
        100,
        Math.round((hits / Math.max(normalizedTerms.length, 1)) * 100 * confidenceWeight + hits * 10)
      );

      const relatedEntries: IKnowledgeEntry[] = [];
      for (const relId of entry.relatedEntryIds || []) {
        const rel = entryMap.get(relId.toString());
        if (rel) relatedEntries.push(rel);
      }

      const confidenceNote = confidence ? ` med confidence ${confidence}/5` : '';
      results.push({
        entry,
        score,
        reason: hits > 0
          ? `Matcher ${hits} nøgleord${confidenceNote}`
          : `Relevant ${entry.type}${confidenceNote}`,
        relatedEntries,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  collectRelatedIds(matches: KnowledgeMatchResult[]): string[] {
    const ids = new Set<string>();
    for (const match of matches) {
      ids.add(match.entry._id.toString());
      for (const rel of match.relatedEntries) {
        ids.add(rel._id.toString());
      }
    }
    return Array.from(ids);
  }
}

export const knowledgeMatcher = new KnowledgeMatcher();
