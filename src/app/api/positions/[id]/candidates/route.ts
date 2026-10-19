import { NextRequest, NextResponse } from 'next/server';
import { findPositionByIdOrSlug } from '@/lib/findPosition';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { listCandidatesForPosition } from '@/lib/queries/candidates';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await findPositionByIdOrSlug(id);
  if (!position) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Position not found' } }, { status: 404 });
  }

  const results = await listCandidatesForPosition(position.id, getCurrentUserId(), {
    party: req.nextUrl.searchParams.get('party'),
    topics: req.nextUrl.searchParams.getAll('topic'),
    sort: req.nextUrl.searchParams.get('sort'),
  });
  return NextResponse.json(results);
}
