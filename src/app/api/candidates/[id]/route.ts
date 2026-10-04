import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { buildCandidateDetail, NotFoundError } from '@/lib/serializers/candidateDetail';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = getCurrentUserId();
    const detail = await buildCandidateDetail(id, userId);
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: { code: 'not_found', message: err.message } }, { status: 404 });
    }
    throw err;
  }
}
