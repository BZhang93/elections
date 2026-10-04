require('dotenv').config();
const { Client } = require('pg');

const TOPICS = [
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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  for (const [slug, label, description] of TOPICS) {
    await client.query(
      `insert into topics (slug, label, description) values ($1, $2, $3)
       on conflict (slug) do update set label = excluded.label, description = excluded.description`,
      [slug, label, description]
    );
  }

  const { rows } = await client.query(
    `insert into users (email, display_name) values ($1, $2)
     on conflict (email) do update set display_name = excluded.display_name
     returning id`,
    ['blue.prime.80@gmail.com', 'Default User']
  );
  console.log('Seeded topics. Default user id:', rows[0].id);
  console.log('Set DEFAULT_USER_ID in your .env to the id above.');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
