import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPositionByIdOrSlug } from '@/lib/findPosition';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { computeCandidateAlignment } from '@/lib/scoring/alignment';
import { loadCandidateItemsForScoring, loadUserAlignmentInputs } from '@/lib/scoring/loadInputs';
import { Party } from '@/generated/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await findPositionByIdOrSlug(id);
  if (!position) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Position not found' } }, { status: 404 });
  }

  const party = req.nextUrl.searchParams.get('party');
  const topicSlugs = req.nextUrl.searchParams.getAll('topic');
  const sort = req.nextUrl.searchParams.get('sort');

  const candidates = await prisma.candidate.findMany({
    where: {
      positionId: position.id,
      status: 'active',
      ...(party ? { party: party as Party } : {}),
      ...(topicSlugs.length > 0
        ? { candidateTopics: { some: { topic: { slug: { in: topicSlugs } } } } }
        : {}),
    },
    include: { candidateTopics: { include: { topic: true } } },
    orderBy: { fullName: 'asc' },
  });

  const userId = getCurrentUserId();
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
        alignment_score: score_0_100,
        topics: c.candidateTopics.map((ct) => ct.topic.slug),
      };
    })
  );

  if (sort === 'alignment') {
    results.sort((a, b) => (b.alignment_score ?? 0) - (a.alignment_score ?? 0));
  }

  return NextResponse.json(results);
}
