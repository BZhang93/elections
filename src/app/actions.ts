'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';

export async function savePreferences(formData: FormData) {
  const userId = getCurrentUserId();
  const topics = await prisma.topic.findMany({ select: { id: true, slug: true } });
  const topicIdBySlug = new Map(topics.map((t) => [t.slug, t.id]));

  const stanceValues = new Set(['a', 'b', 'none']);
  const rows = formData
    .getAll('topic')
    .map(String)
    .filter((slug) => topicIdBySlug.has(slug))
    .map((slug, index) => {
      const stance = String(formData.get(`stance_${slug}`) ?? 'none');
      return {
        userId,
        topicId: topicIdBySlug.get(slug)!,
        rank: index + 1,
        stance: (stanceValues.has(stance) ? stance : 'none') as 'a' | 'b' | 'none',
      };
    });

  const content = String(formData.get('freetext') ?? '').trim();
  const extractedKeywords = content
    .split(/[.,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  await prisma.$transaction([
    prisma.userTopicPriority.deleteMany({ where: { userId } }),
    prisma.userTopicPriority.createMany({ data: rows }),
    prisma.userFreetextInput.deleteMany({ where: { userId } }),
    ...(content ? [prisma.userFreetextInput.create({ data: { userId, content, extractedKeywords } })] : []),
    prisma.candidateAlignmentCache.deleteMany({ where: { userId } }),
  ]);

  revalidatePath('/', 'layout');
}

export async function rateStance(formData: FormData) {
  const userId = getCurrentUserId();
  const targetType = String(formData.get('targetType'));
  const targetId = String(formData.get('targetId'));
  const candidateId = String(formData.get('candidateId'));
  const agreement = Number(formData.get('agreement'));
  const importance = Number(formData.get('importance'));

  const field = {
    platform_item: 'platformItemId',
    policy_item: 'policyItemId',
    voting_history_item: 'votingHistoryItemId',
  }[targetType];
  if (!field) throw new Error(`Unknown target type: ${targetType}`);

  const existing = await prisma.userStanceRating.findFirst({ where: { userId, [field]: targetId } });
  if (existing) {
    await prisma.userStanceRating.update({
      where: { id: existing.id },
      data: { agreementScore: agreement, importanceScore: importance },
    });
  } else {
    await prisma.userStanceRating.create({
      data: { userId, [field]: targetId, agreementScore: agreement, importanceScore: importance },
    });
  }

  await prisma.candidateAlignmentCache.deleteMany({ where: { userId } });
  revalidatePath(`/candidates/${candidateId}`);
}

export async function requestSummary(formData: FormData) {
  const candidateId = String(formData.get('candidateId'));
  const existing = await prisma.aiJob.findFirst({ where: { candidateId, kind: 'summary', status: 'pending' } });
  if (!existing) {
    await prisma.aiJob.create({ data: { candidateId, kind: 'summary' } });
  }
  revalidatePath(`/candidates/${candidateId}`);
}
