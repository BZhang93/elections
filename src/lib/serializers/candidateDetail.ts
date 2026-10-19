import { prisma } from '@/lib/prisma';
import { computeCandidateAlignment, highlightStatusFor, UserAlignmentInputs } from '@/lib/scoring/alignment';
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
  const ratingFor = (type: string, id: string) => {
    const r = userInputs.ratings.get(`${type}:${id}`);
    return r ? { agreementScore: r.agreementScore, importanceScore: r.importanceScore } : null;
  };

  const stats = await prisma.candidateStat.findMany({
    where: { candidateId },
    orderBy: { sortOrder: 'asc' },
    include: { topic: true, citations: { include: { citation: true } } },
  });

  const fundraisingSources = await prisma.fundraisingSource.findMany({
    where: { candidateId },
    orderBy: { amount: 'desc' },
    include: { citations: { include: { citation: true } } },
  });

  const contrastingStances = await loadContrastingStances(candidate.positionId, candidateId, userInputs.priorities);

  const raceTopics = await prisma.topic.findMany({ orderBy: { label: 'asc' } });
  const ratings = buildRatings(
    raceTopics,
    [
      ...platformItems.flatMap((item) => item.topics),
      ...policyItems.flatMap((item) => item.topics),
      ...votingItems.flatMap((item) => item.topics),
    ]
  );

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
      rating: ratingFor('platform_item', item.id),
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
      rating: ratingFor('policy_item', item.id),
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
      rating: ratingFor('voting_history_item', item.id),
    })),
    contrastingStances,
    ratings,
    stats: stats.map((st) => ({
      id: st.id,
      summary: st.summary,
      topic: st.topic ? { slug: st.topic.slug, label: st.topic.label } : null,
      citations: serializeCitations(st.citations),
    })),
    fundraising_sources: fundraisingSources.map((f) => ({
      id: f.id,
      source_name: f.sourceName,
      source_type: f.sourceType,
      amount: f.amount.toFixed(2),
      cycle: f.cycle,
      citations: serializeCitations(f.citations),
    })),
  };
}

type TopicLink = {
  side: 'a' | 'b' | null;
  topic: { id: string; slug: string; label: string; sideALabel: string; sideBLabel: string };
};

export type TopicLean = 'a' | 'b' | 'mixed';

function buildRatings(
  raceTopics: Array<{ id: string; slug: string; label: string; sideALabel: string; sideBLabel: string }>,
  links: TopicLink[]
) {
  const counts = new Map<string, { topic: TopicLink['topic']; a: number; b: number }>();
  for (const link of links) {
    if (!link.side) continue;
    const entry = counts.get(link.topic.id) ?? { topic: link.topic, a: 0, b: 0 };
    if (link.side === 'a') entry.a += 1;
    else entry.b += 1;
    counts.set(link.topic.id, entry);
  }

  const rated = [...counts.values()].map(({ topic, a, b }) => {
    const lean: TopicLean = a > b ? 'a' : b > a ? 'b' : 'mixed';
    const leanLabel = lean === 'a' ? topic.sideALabel : lean === 'b' ? topic.sideBLabel : 'Mixed';
    return { slug: topic.slug, label: topic.label, lean, leanLabel, aCount: a, bCount: b };
  });

  const ratedIds = new Set(counts.keys());
  const noStanceIdentified = raceTopics
    .filter((t) => !ratedIds.has(t.id))
    .map((t) => ({ slug: t.slug, label: t.label }));

  return { rated, noStanceIdentified };
}

async function loadContrastingStances(
  positionId: string,
  candidateId: string,
  priorities: UserAlignmentInputs['priorities']
) {
  const TOP_N = 3;
  const topPriorities = [...priorities.entries()]
    .filter(([, p]) => p.rank <= TOP_N)
    .sort((a, b) => a[1].rank - b[1].rank);
  if (topPriorities.length === 0) return [];
  const priorityTopicIds = topPriorities.map(([id]) => id);

  const items = await prisma.platformItem.findMany({
    where: {
      candidate: { positionId, id: { not: candidateId } },
      topics: { some: { topicId: { in: priorityTopicIds } } },
    },
    include: { candidate: true, topics: { include: { topic: true } } },
    orderBy: { candidate: { fullName: 'asc' } },
  });

  return topPriorities
    .map(([topicId, priority]) => ({
      topic: priority.label,
      items: items
        .filter((item) => item.topics.some((t) => t.topicId === topicId))
        .slice(0, 5)
        .map((item) => ({ candidateId: item.candidate.id, candidateName: item.candidate.fullName, itemText: item.text })),
    }))
    .filter((group) => group.items.length > 0);
}
