import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const TOPICS: Array<[string, string, string, string, string]> = [
  ['economic_growth', 'Economic Growth', 'Whether the economy should grow through business expansion or through worker-focused growth. Covers job creation, small business support, and who benefits from growth.', 'More business growth', 'More worker growth'],
  ['economic_equality', 'Economic Equality', 'Whether economic gains should be shared widely, through more regulation of employers and markets, or left to market outcomes. Covers wages, labor protections, and corporate concentration.', 'More regulation', 'Less regulation'],
  ['affordability', 'Affordability', 'The cost of living: whether prices for housing, utilities, healthcare, and daily needs should be lowered through more regulation or through less.', 'More regulation', 'Less regulation'],
  ['environment', 'Environmental Protections and Sustainability', 'Climate and energy policy, water, and conservation. Whether environmental rules should expand or be rolled back.', 'Less environmental regulation', 'More environmental regulation'],
  ['safety', 'Public Safety', 'Policing, enforcement, and crime prevention. Whether the priority is tougher enforcement or prevention and reform.', 'Tougher enforcement', 'Prevention and reform'],
  ['homelessness', 'Homelessness', 'The response to homelessness: enforcement and shelter requirements, or housing-first and services.', 'Enforcement and shelter requirements', 'Housing-first and services'],
  ['housing', 'Housing', 'Housing supply and zoning: building more with looser rules, or stronger local control and tenant protections.', 'Build more, looser zoning', 'Local control and tenant protections'],
  ['education', 'Educational Investment', 'K-12 and higher education: school choice and parental options, or public school funding.', 'School choice', 'Public school funding'],
  ['healthcare', 'Healthcare Accessibility and Quality', 'Access and cost of healthcare: expanding public coverage, or private and market options.', 'Expand public coverage', 'Private and market options'],
  ['immigration', 'Immigration', 'Immigration policy: stricter enforcement, or expanded pathways and protections.', 'Stricter enforcement', 'Expanded pathways and protections'],
  ['taxes', 'Taxes', 'Tax policy: lower taxes, or higher revenue to fund public services.', 'Lower taxes', 'Higher revenue'],
  ['criminal_justice', 'Criminal Justice Reform', 'Sentencing, courts, and incarceration: tough sentencing, or rehabilitation and reform.', 'Tough sentencing', 'Rehabilitation and reform'],
];

async function main() {
  // Seeds must use the direct connection, not the pooled one (no prepared statements).
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
  const prisma = new PrismaClient({ adapter });

  for (const [slug, label, description, sideALabel, sideBLabel] of TOPICS) {
    await prisma.topic.upsert({
      where: { slug },
      create: { slug, label, description, sideALabel, sideBLabel },
      update: { label, description, sideALabel, sideBLabel },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: 'blue.prime.80@gmail.com' },
    create: { email: 'blue.prime.80@gmail.com', displayName: 'Default User' },
    update: { displayName: 'Default User' },
  });

  console.log('Seeded topics. Default user id:', user.id);
  console.log('Set DEFAULT_USER_ID in your .env to the id above.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
