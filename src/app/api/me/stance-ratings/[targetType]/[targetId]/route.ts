import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';

const TARGET_FIELD: Record<string, 'platformItemId' | 'policyItemId' | 'votingHistoryItemId'> = {
  platform_item: 'platformItemId',
  policy_item: 'policyItemId',
  voting_history_item: 'votingHistoryItemId',
};

export async function PUT(req: Request, { params }: { params: Promise<{ targetType: string; targetId: string }> }) {
  const { targetType, targetId } = await params;
  const field = TARGET_FIELD[targetType];
  if (!field) {
    return NextResponse.json(
      { error: { code: 'invalid_target_type', message: `targetType must be one of ${Object.keys(TARGET_FIELD).join(', ')}` } },
      { status: 400 }
    );
  }

  const userId = getCurrentUserId();
  const { agreement_score, importance_score } = await req.json();

  // Upsert keyed on the (userId, <field>) unique constraint. Prisma needs the
  // compound-unique input name, which matches `${field}` since each is unique on its own.
  const existing = await prisma.userStanceRating.findFirst({ where: { userId, [field]: targetId } });
  if (existing) {
    await prisma.userStanceRating.update({
      where: { id: existing.id },
      data: { agreementScore: agreement_score, importanceScore: importance_score ?? null },
    });
  } else {
    await prisma.userStanceRating.create({
      data: { userId, [field]: targetId, agreementScore: agreement_score, importanceScore: importance_score ?? null },
    });
  }

  await prisma.candidateAlignmentCache.deleteMany({ where: { userId } });
  return new NextResponse(null, { status: 204 });
}
