import { prisma } from '@/lib/prisma';
import { Party } from '@/generated/prisma';
import { computeCandidateAlignment } from '@/lib/scoring/alignment';
import { loadCandidateItemsForScoring, loadUserAlignmentInputs } from '@/lib/scoring/loadInputs';

export interface CandidateListFilters {
  party?: string | null;
  topics?: string[];
  sort?: string | null;
}

export async function listCandidatesForPosition(positionId: string, userId: string, filters: CandidateListFilters) {
  const candidates = await prisma.candidate.findMany({
    where: {
      positionId,
      status: 'active',
      ...(filters.party ? { party: filters.party as Party } : {}),
      ...(filters.topics && filters.topics.length > 0
        ? { candidateTopics: { some: { topic: { slug: { in: filters.topics } } } } }
        : {}),
    },
    include: { candidateTopics: { include: { topic: true } } },
    orderBy: { fullName: 'asc' },
  });

  const userInputs = await loadUserAlignmentInputs(userId);

  const results = await Promise.all(
    candidates.map(async (c) => {
      const items = await loadCandidateItemsForScoring(c.id);
      const { score_0_100 } = computeCandidateAlignment(items, userInputs);
      return {
        id: c.id,
        full_name: c.fullName,
        party: c.party,
        current_position_title: c.currentPositionTitle,
        ai_summary: c.aiSummary,
        ai_summary_is_hand_written: c.aiSummary !== null && c.aiSummaryGeneratedAt === null,
        alignment_score: score_0_100,
        topics: c.candidateTopics.map((ct) => ct.topic.slug),
      };
    })
  );

  if (filters.sort === 'alignment') {
    results.sort((a, b) => (b.alignment_score ?? -1) - (a.alignment_score ?? -1));
  }

  return results;
}
