import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPositionByIdOrSlug } from '@/lib/findPosition';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { buildCandidateDetail } from '@/lib/serializers/candidateDetail';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await findPositionByIdOrSlug(id);
  if (!position) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Position not found' } }, { status: 404 });
  }

  const candidateIds = (req.nextUrl.searchParams.get('candidateIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (candidateIds.length < 2 || candidateIds.length > 5) {
    return NextResponse.json({ error: { code: 'invalid_range', message: 'candidateIds must contain 2-5 ids' } }, { status: 400 });
  }

  const owned = await prisma.candidate.findMany({ where: { id: { in: candidateIds }, positionId: position.id } });
  if (owned.length !== candidateIds.length) {
    return NextResponse.json(
      { error: { code: 'mismatched_position', message: 'All candidates must belong to this position' } },
      { status: 400 }
    );
  }

  const userId = getCurrentUserId();
  const details = await Promise.all(candidateIds.map((cid) => buildCandidateDetail(cid, userId)));
  return NextResponse.json(details);
}
