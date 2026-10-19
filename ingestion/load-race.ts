import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Party, PositionLevel, SourceType, ItemDirection } from '../src/generated/prisma';

type CitationInput = { url: string; sourceType: SourceType; title?: string; publisher?: string; rawExcerpt?: string };
type TopicTag = string | { slug: string; side?: 'a' | 'b' | null };
type ItemInput = {
  text: string;
  stanceSummary?: string;
  direction?: ItemDirection;
  topics: TopicTag[];
  citations: CitationInput[];
};
type PolicyInput = {
  actionText: string;
  effectText?: string;
  stanceSummary?: string;
  direction?: ItemDirection;
  date?: string;
  topics: TopicTag[];
  citations: CitationInput[];
};
type FundraisingInput = {
  sourceName: string;
  sourceType: string;
  amount: string;
  cycle?: string;
  citations: CitationInput[];
};
type StatInput = {
  summary: string;
  topic?: string;
  citations: CitationInput[];
};
type CandidateInput = {
  stats?: StatInput[];
  fullName: string;
  party: Party;
  isIncumbent?: boolean;
  currentPositionTitle?: string;
  campaignSiteUrl?: string;
  historyText?: string;
  aiSummary?: string;
  platform: ItemInput[];
  policies: PolicyInput[];
  fundraising?: FundraisingInput[];
};
type RaceConfig = {
  position: {
    slug: string;
    title: string;
    level: PositionLevel;
    jurisdiction?: string;
    electionCycle?: string;
    electionDate?: string;
  };
  candidates: CandidateInput[];
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

async function upsertCitation(c: CitationInput): Promise<string> {
  const rawExcerpt = c.rawExcerpt ?? null;
  const existing = await prisma.citation.findFirst({ where: { url: c.url, rawExcerpt } });
  if (existing) return existing.id;
  const created = await prisma.citation.create({
    data: { url: c.url, sourceType: c.sourceType, title: c.title, publisher: c.publisher, rawExcerpt },
  });
  return created.id;
}

async function topicLinksFor(tags: TopicTag[]): Promise<Array<{ topicId: string; side: 'a' | 'b' | null }>> {
  const normalized = tags.map((t) => (typeof t === 'string' ? { slug: t, side: null } : { slug: t.slug, side: t.side ?? null }));
  const slugs = normalized.map((t) => t.slug);
  const rows = await prisma.topic.findMany({ where: { slug: { in: slugs } } });
  const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
  if (missing.length > 0) throw new Error(`Unknown topic slugs: ${missing.join(', ')}`);
  return normalized.map((t) => ({ topicId: rows.find((r) => r.slug === t.slug)!.id, side: t.side }));
}

async function loadCandidate(positionId: string, input: CandidateInput) {
  const candidate = await prisma.candidate.upsert({
    where: { positionId_fullName: { positionId, fullName: input.fullName } },
    create: {
      positionId,
      fullName: input.fullName,
      party: input.party,
      isIncumbent: input.isIncumbent ?? false,
      currentPositionTitle: input.currentPositionTitle,
      campaignSiteUrl: input.campaignSiteUrl,
      historyText: input.historyText,
      aiSummary: input.aiSummary,
    },
    update: {
      party: input.party,
      isIncumbent: input.isIncumbent ?? false,
      currentPositionTitle: input.currentPositionTitle,
      campaignSiteUrl: input.campaignSiteUrl,
      historyText: input.historyText,
      aiSummary: input.aiSummary,
    },
  });

  // Replace this candidate's content so re-running the loader is idempotent.
  await prisma.platformItem.deleteMany({ where: { candidateId: candidate.id } });
  await prisma.policyItem.deleteMany({ where: { candidateId: candidate.id } });
  await prisma.fundraisingSource.deleteMany({ where: { candidateId: candidate.id } });
  await prisma.candidateStat.deleteMany({ where: { candidateId: candidate.id } });

  for (const [index, stat] of (input.stats ?? []).entries()) {
    const topic = stat.topic ? (await topicLinksFor([stat.topic]))[0].topicId : null;
    const citationIds = await Promise.all(stat.citations.map(upsertCitation));
    await prisma.candidateStat.create({
      data: {
        candidateId: candidate.id,
        summary: stat.summary,
        topicId: topic,
        sortOrder: index,
        citations: { create: citationIds.map((citationId) => ({ citationId })) },
      },
    });
  }

  const candidateTopicIds = new Set<string>();

  for (const [index, item] of input.platform.entries()) {
    const links = await topicLinksFor(item.topics);
    links.forEach((l) => candidateTopicIds.add(l.topicId));
    const citationIds = await Promise.all(item.citations.map(upsertCitation));
    await prisma.platformItem.create({
      data: {
        candidateId: candidate.id,
        text: item.text,
        stanceSummary: item.stanceSummary,
        direction: item.direction,
        sortOrder: index,
        topics: { create: links },
        citations: { create: citationIds.map((citationId) => ({ citationId })) },
      },
    });
  }

  for (const [index, item] of input.policies.entries()) {
    const links = await topicLinksFor(item.topics);
    links.forEach((l) => candidateTopicIds.add(l.topicId));
    const citationIds = await Promise.all(item.citations.map(upsertCitation));
    await prisma.policyItem.create({
      data: {
        candidateId: candidate.id,
        actionText: item.actionText,
        effectText: item.effectText,
        stanceSummary: item.stanceSummary,
        direction: item.direction,
        date: item.date ? new Date(item.date) : null,
        sortOrder: index,
        topics: { create: links },
        citations: { create: citationIds.map((citationId) => ({ citationId })) },
      },
    });
  }

  for (const f of input.fundraising ?? []) {
    const citationIds = await Promise.all(f.citations.map(upsertCitation));
    await prisma.fundraisingSource.create({
      data: {
        candidateId: candidate.id,
        sourceName: f.sourceName,
        sourceType: f.sourceType as never,
        amount: f.amount,
        cycle: f.cycle,
        citations: { create: citationIds.map((citationId) => ({ citationId })) },
      },
    });
  }

  await prisma.candidateTopic.deleteMany({ where: { candidateId: candidate.id } });
  await prisma.candidateTopic.createMany({
    data: [...candidateTopicIds].map((topicId) => ({ candidateId: candidate.id, topicId })),
  });

  return candidate.id;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) throw new Error('Usage: tsx ingestion/load-race.ts <path/to/race.json>');
  const config: RaceConfig = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf8'));

  const position = await prisma.position.upsert({
    where: { slug: config.position.slug },
    create: {
      slug: config.position.slug,
      title: config.position.title,
      level: config.position.level,
      jurisdiction: config.position.jurisdiction,
      electionCycle: config.position.electionCycle,
      electionDate: config.position.electionDate ? new Date(config.position.electionDate) : null,
    },
    update: {
      title: config.position.title,
      level: config.position.level,
      jurisdiction: config.position.jurisdiction,
      electionCycle: config.position.electionCycle,
      electionDate: config.position.electionDate ? new Date(config.position.electionDate) : null,
    },
  });

  for (const candidate of config.candidates) {
    await loadCandidate(position.id, candidate);
    console.log(`Loaded ${candidate.fullName}: ${candidate.platform.length} platform, ${candidate.policies.length} policy items`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
