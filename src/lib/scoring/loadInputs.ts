import { prisma } from '@/lib/prisma';
import { ScoringItem, ScoringItemType, Stance, UserAlignmentInputs, UserPriority, UserRatingInput } from './alignment';

export async function loadUserAlignmentInputs(userId: string): Promise<UserAlignmentInputs> {
  const [priorityRows, ratingRows, freetextRow] = await Promise.all([
    prisma.userTopicPriority.findMany({ where: { userId }, include: { topic: true } }),
    prisma.userStanceRating.findMany({ where: { userId } }),
    prisma.userFreetextInput.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const priorities = new Map<string, UserPriority>();
  for (const row of priorityRows) {
    priorities.set(row.topicId, {
      rank: row.rank,
      stance: row.stance as Stance,
      label: row.topic.label,
      sideALabel: row.topic.sideALabel,
      sideBLabel: row.topic.sideBLabel,
    });
  }

  const ratings = new Map<string, UserRatingInput>();
  for (const row of ratingRows) {
    let targetType: ScoringItemType;
    let targetId: string;
    if (row.platformItemId) {
      targetType = 'platform_item';
      targetId = row.platformItemId;
    } else if (row.policyItemId) {
      targetType = 'policy_item';
      targetId = row.policyItemId;
    } else {
      targetType = 'voting_history_item';
      targetId = row.votingHistoryItemId!;
    }
    ratings.set(`${targetType}:${targetId}`, {
      targetType,
      targetId,
      agreementScore: row.agreementScore,
      importanceScore: row.importanceScore,
    });
  }

  return {
    priorities,
    rankedTopicCount: priorityRows.length,
    ratings,
    freetextKeywords: freetextRow?.extractedKeywords ?? [],
  };
}

export async function loadCandidateItemsForScoring(candidateId: string): Promise<ScoringItem[]> {
  const include = { topics: { include: { topic: true } } } as const;
  const [platform, policy, voting] = await Promise.all([
    prisma.platformItem.findMany({ where: { candidateId }, include }),
    prisma.policyItem.findMany({ where: { candidateId }, include }),
    prisma.votingHistoryItem.findMany({ where: { candidateId }, include }),
  ]);

  const toTopics = (rows: Array<{ side: 'a' | 'b' | null; topic: { id: string; slug: string; label: string; sideALabel: string; sideBLabel: string } }>) =>
    rows.map((t) => ({
      id: t.topic.id,
      slug: t.topic.slug,
      label: t.topic.label,
      sideALabel: t.topic.sideALabel,
      sideBLabel: t.topic.sideBLabel,
      side: t.side,
    }));

  return [
    ...platform.map((row) => ({
      id: row.id,
      type: 'platform_item' as const,
      text: row.text,
      stanceSummary: row.stanceSummary,
      topics: toTopics(row.topics),
    })),
    ...policy.map((row) => ({
      id: row.id,
      type: 'policy_item' as const,
      text: row.actionText,
      stanceSummary: row.stanceSummary,
      topics: toTopics(row.topics),
    })),
    ...voting.map((row) => ({
      id: row.id,
      type: 'voting_history_item' as const,
      text: `${row.billTitle} ${row.summary ?? ''}`,
      stanceSummary: row.stanceSummary,
      topics: toTopics(row.topics),
    })),
  ];
}
