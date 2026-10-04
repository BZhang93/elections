import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const TOPICS: Array<[string, string, string]> = [
  ['economy', 'Economy', 'Jobs, taxes, cost of living, business policy'],
  ['environment', 'Environment', 'Climate, conservation, energy policy'],
  ['safety', 'Public Safety', 'Policing, crime, criminal justice'],
  ['homelessness', 'Homelessness', 'Homelessness response and services'],
  ['housing', 'Housing', 'Housing supply, affordability, zoning'],
  ['education', 'Education', 'K-12 and higher education policy'],
  ['healthcare', 'Healthcare', 'Healthcare access and cost'],
  ['immigration', 'Immigration', 'Immigration policy and enforcement'],
  ['taxes', 'Taxes', 'Tax policy'],
  ['criminal_justice', 'Criminal Justice', 'Sentencing, courts, incarceration'],
];

async function main() {
  // Seeds must use the direct connection, not the pooled one (no prepared statements).
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
  const prisma = new PrismaClient({ adapter });

  for (const [slug, label, description] of TOPICS) {
    await prisma.topic.upsert({
      where: { slug },
      create: { slug, label, description },
      update: { label, description },
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
