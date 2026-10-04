import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';

export async function GET() {
  const userId = getCurrentUserId();
  const rows = await prisma.userTopicPriority.findMany({ where: { userId } });
  return NextResponse.json(rows.map((r) => ({ topic_id: r.topicId, priority_weight: r.priorityWeight })));
}

export async function PUT(req: Request) {
  const userId = getCurrentUserId();
  const priorities: Array<{ topic_id: string; priority_weight: number }> = await req.json();

  await prisma.$transaction([
    prisma.userTopicPriority.deleteMany({ where: { userId } }),
    prisma.userTopicPriority.createMany({
      data: priorities.map((p) => ({ userId, topicId: p.topic_id, priorityWeight: p.priority_weight })),
    }),
    prisma.candidateAlignmentCache.deleteMany({ where: { userId } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
