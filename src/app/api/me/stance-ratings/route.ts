import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId();
  const positionId = req.nextUrl.searchParams.get('positionId');

  const rows = await prisma.userStanceRating.findMany({
    where: {
      userId,
      ...(positionId
        ? {
            OR: [
              { platformItem: { candidate: { positionId } } },
              { policyItem: { candidate: { positionId } } },
              { votingHistoryItem: { candidate: { positionId } } },
            ],
          }
        : {}),
    },
  });
  return NextResponse.json(rows);
}
