import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const topics = await prisma.topic.findMany({ orderBy: { label: 'asc' } });
  return NextResponse.json(topics);
}
