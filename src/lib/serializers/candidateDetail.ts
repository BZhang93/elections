import { prisma } from '@/lib/prisma';
import { computeCandidateAlignment, highlightStatusFor } from '@/lib/scoring/alignment';
import { loadCandidateItemsForScoring, loadUserAlignmentInputs } from '@/lib/scoring/loadInputs';

function serializeTopics(topics: Array<{ topic: { id: string; slug: string; label: string } }>) {
  return topics.map((t) => ({ id: t.topic.id, slug: t.topic.slug, label: t.topic.label }));
}

function serializeCitations(citations: Array<{ citation: { id: string; url: string; sourceType: string; title: string | null; publisher: string | null; publishedDate: Date | null; rawExcerpt: string | null } }>) {
  return citations.map((c) => ({
    id: c.citation.id,
    url: c.citation.url,
    source_type: c.citation.sourceType,
    title: c.citation.title,
    publisher: c.citation.publisher,
    published_date: c.citation.publishedDate,
    raw_excerpt: c.citation.rawExcerpt,
  }));
}

export class NotFoundError extends Error {}

export async function buildCandidateDetail(candidateId: string, userId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new NotFoundError('Candidate not found');

  const [platformItems, policyItems, votingItems] = await Promise.all([
    prisma.platformItem.findMany({
      where: { candidateId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { topics: { include: { topic: true } }, citations: { include: { citation: true } } },
    }),
    prisma.policyItem.findMany({
      where: { candidateId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { topics: { include: { topic: true } }, citations: { include: { citation: true } } },
    }),
    prisma.votingHistoryItem.findMany({
      where: { candidateId },
      orderBy: { date: 'desc' },
      include: { topics: { include: { topic: true } }, citations: { include: { citation: true } } },
    }),
  ]);

  const userInputs = await loadUserAlignmentInputs(userId);
  const scoringItems = await loadCandidateItemsForScoring(candidateId);
  const { score_0_100, perItemSignals } = computeCandidateAlignment(scoringItems, userInputs);

  const highlightFor = (id: string) => {
    const signal = perItemSignals.get(id);
    return { status: highlightStatusFor(signal), reason: signal?.reason ?? undefined };
  };

  const contrastingStances = await loadContrastingStances(candidate.positionId, candidateId, userInputs.topicPriorities);

  return {
    id: candidate.id,
    position_id: candidate.positionId,
    full_name: candidate.fullName,
    party: candidate.party,
    is_incumbent: candidate.isIncumbent,
    current_position_title: candidate.currentPositionTitle,
    photo_url: candidate.photoUrl,
    campaign_site_url: candidate.campaignSiteUrl,
    ai_summary: candidate.aiSummary,
    history_text: candidate.historyText,
    alignment_score: score_0_100,
    platform_items: platformItems.map((item) => ({
      id: item.id,
      text: item.text,
      stance_summary: item.stanceSummary,
      sort_order: item.sortOrder,
      topics: serializeTopics(item.topics),
      citations: serializeCitations(item.citations),
      highlight: highlightFor(item.id),
    })),
    policy_items: policyItems.map((item) => ({
      id: item.id,
      action_text: item.actionText,
      effect_text: item.effectText,
      stance_summary: item.stanceSummary,
      date: item.date,
      sort_order: item.sortOrder,
      topics: serializeTopics(item.topics),
      citations: serializeCitations(item.citations),
      highlight: highlightFor(item.id),
    })),
    voting_history_items: votingItems.map((item) => ({
      id: item.id,
      bill_identifier: item.billIdentifier,
      bill_title: item.billTitle,
      vote: item.vote,
      summary: item.summary,
      date: item.date,
      source_system: item.sourceSystem,
      topics: serializeTopics(item.topics),
      citations: serializeCitations(item.citations),
      highlight: highlightFor(item.id),
    })),
    contrastingStances,
  };
}

async function loadContrastingStances(positionId: string, candidateId: string, topicPriorities: Map<string, number>) {
  const priorityTopicIds = [...topicPriorities.entries()].filter(([, w]) => w >= 0.6).map(([id]) => id);
  if (priorityTopicIds.length === 0) return [];

  const items = await prisma.platformItem.findMany({
    where: {
      candidate: { positionId, id: { not: candidateId } },
      topics: { some: { topicId: { in: priorityTopicIds } } },
    },
    include: { candidate: true, topics: { include: { topic: true } } },
    orderBy: { candidate: { fullName: 'asc' } },
    take: 10,
  });

  return items.flatMap((item) =>
    item.topics
      .filter((t) => priorityTopicIds.includes(t.topicId))
      .map((t) => ({
        candidateId: item.candidate.id,
        candidateName: item.candidate.fullName,
        itemText: item.text,
        topic: t.topic.slug,
      }))
  );
}
