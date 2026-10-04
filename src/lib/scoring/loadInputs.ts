import { prisma } from '@/lib/prisma';
import { ScoringItem, UserAlignmentInputs, UserRatingInput, ScoringItemType } from './alignment';

export async function loadUserAlignmentInputs(userId: string): Promise<UserAlignmentInputs> {
  const [priorityRows, ratingRows, freetextRow] = await Promise.all([
    prisma.userTopicPriority.findMany({ where: { userId } }),
    prisma.userStanceRating.findMany({ where: { userId } }),
    prisma.userFreetextInput.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const topicPriorities = new Map<string, number>();
  for (const row of priorityRows) {
    topicPriorities.set(row.topicId, Number(row.priorityWeight));
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

  const freetextKeywords = freetextRow?.extractedKeywords ?? [];

  return { topicPriorities, ratings, freetextKeywords };
}

export async function loadCandidateItemsForScoring(candidateId: string): Promise<ScoringItem[]> {
  const [platform, policy, voting] = await Promise.all([
    prisma.platformItem.findMany({ where: { candidateId }, include: { topics: true } }),
    prisma.policyItem.findMany({ where: { candidateId }, include: { topics: true } }),
    prisma.votingHistoryItem.findMany({ where: { candidateId }, include: { topics: true } }),
  ]);

  const items: ScoringItem[] = [];
  for (const row of platform) {
    items.push({
      id: row.id,
      type: 'platform_item',
      text: row.text,
      stanceSummary: row.stanceSummary,
      topicIds: row.topics.map((t) => t.topicId),
    });
  }
  for (const row of policy) {
    items.push({
      id: row.id,
      type: 'policy_item',
      text: row.actionText,
      stanceSummary: row.stanceSummary,
      topicIds: row.topics.map((t) => t.topicId),
    });
  }
  for (const row of voting) {
    items.push({
      id: row.id,
      type: 'voting_history_item',
      text: `${row.billTitle} ${row.summary ?? ''}`,
      stanceSummary: row.stanceSummary,
      topicIds: row.topics.map((t) => t.topicId),
    });
  }
  return items;
}
