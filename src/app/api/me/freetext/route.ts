import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';

export async function GET() {
  const userId = getCurrentUserId();
  const row = await prisma.userFreetextInput.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const userId = getCurrentUserId();
  const { content } = await req.json();

  // v1: naive keyword extraction placeholder. Swap for an LLM extraction call
  // once an LLM key is wired up (see ingestion pipeline's AI summarization step).
  const extractedKeywords: string[] = content
    .split(/[.,;\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const row = await prisma.userFreetextInput.create({
    data: { userId, content, extractedKeywords },
  });

  await prisma.candidateAlignmentCache.deleteMany({ where: { userId } });
  return NextResponse.json(row);
}
