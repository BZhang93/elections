import { NextResponse } from 'next/server';
import { findPositionByIdOrSlug } from '@/lib/findPosition';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await findPositionByIdOrSlug(id);
  if (!position) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Position not found' } }, { status: 404 });
  }
  return NextResponse.json(position);
}
