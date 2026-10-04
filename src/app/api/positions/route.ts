import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PositionLevel } from '@/generated/prisma';

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get('level');
  const cycle = req.nextUrl.searchParams.get('cycle');

  const positions = await prisma.position.findMany({
    where: {
      ...(level ? { level: level as PositionLevel } : {}),
      ...(cycle ? { electionCycle: cycle } : {}),
    },
    orderBy: { title: 'asc' },
  });
  return NextResponse.json(positions);
}
