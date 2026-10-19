import 'dotenv/config';
import fs from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

async function list() {
  const jobs = await prisma.aiJob.findMany({ where: { status: 'pending' }, orderBy: { requestedAt: 'asc' } });
  const out = [];
  for (const job of jobs) {
    const candidate = await prisma.candidate.findUniqueOrThrow({
      where: { id: job.candidateId },
      include: {
        platformItems: { include: { topics: { include: { topic: true } }, citations: { include: { citation: true } } } },
        policyItems: { include: { topics: { include: { topic: true } }, citations: { include: { citation: true } } } },
        stats: { include: { topic: true, citations: { include: { citation: true } } } },
        fundraisingSources: true,
      },
    });
    const cite = (c: { citation: { id: string; url: string; publisher: string | null; rawExcerpt: string | null } }) => ({
      id: c.citation.id, url: c.citation.url, publisher: c.citation.publisher, excerpt: c.citation.rawExcerpt,
    });
    out.push({
      jobId: job.id,
      candidate: candidate.fullName,
      party: candidate.party,
      background: candidate.historyText,
      platform: candidate.platformItems.map((i) => ({
        text: i.text,
        topics: i.topics.map((t) => ({ topic: t.topic.label, side: t.side })),
        citations: i.citations.map(cite),
      })),
      policies: candidate.policyItems.map((i) => ({
        text: i.actionText, effect: i.effectText,
        topics: i.topics.map((t) => ({ topic: t.topic.label, side: t.side })),
        citations: i.citations.map(cite),
      })),
      stats: candidate.stats.map((s) => ({ summary: s.summary, topic: s.topic?.label ?? null, citations: s.citations.map(cite) })),
      fundraising: candidate.fundraisingSources.map((f) => ({ name: f.sourceName, type: f.sourceType, amount: f.amount.toString() })),
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

async function complete(jobId: string, file: string) {
  const result = JSON.parse(fs.readFileSync(file, 'utf8')) as { summary: string; citationIds: string[] };
  const job = await prisma.aiJob.findUniqueOrThrow({ where: { id: jobId } });
  await prisma.candidate.update({
    where: { id: job.candidateId },
    data: { aiSummary: result.summary, aiSummaryGeneratedAt: new Date(), aiSummarySourceIds: result.citationIds },
  });
  await prisma.aiJob.update({
    where: { id: jobId },
    data: { status: 'done', output: result, completedAt: new Date() },
  });
  console.log('completed job', jobId);
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'list') await list();
  else if (cmd === 'complete') await complete(a, b);
  else console.log('Usage: jobs.ts list | jobs.ts complete <jobId> <result.json>');
  await prisma.$disconnect();
})();
