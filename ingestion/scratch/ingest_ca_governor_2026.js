// One-off research-backed data load for the 2026 CA Governor general election
// (Xavier Becerra vs Steve Hilton, per the June 2026 top-two primary).
// Run from repo root: node ingestion/scratch/ingest_ca_governor_2026.js
require('dotenv').config();
const { Client } = require('pg');

const TOPIC_SLUGS = [
  'economy', 'environment', 'safety', 'homelessness', 'housing',
  'education', 'healthcare', 'immigration', 'taxes', 'criminal_justice',
];

const CANDIDATES = [
  {
    full_name: 'Xavier Becerra',
    party: 'Democratic',
    is_incumbent: false,
    current_position_title: 'Former U.S. Secretary of Health and Human Services',
    campaign_site_url: 'https://www.xavierbecerra2026.com/',
    history_text:
      'Xavier Becerra is the son of Mexican immigrants, born January 26, 1958, in Sacramento. He earned BA and JD degrees from Stanford University, becoming the first in his family to graduate college. He served in the California State Assembly (1990-1992), then as a U.S. Representative from California (1993-2017), as California Attorney General (2017-2021), and as U.S. Secretary of Health and Human Services under President Biden (2021-2025). He advanced to the November 2026 general election for California Governor after finishing first in the June 2026 top-two primary.',
    platform_items: [
      {
        text: 'Expanded health coverage to more than 24 million Americans as U.S. Secretary of Health and Human Services.',
        stance_summary: 'supports expanding health coverage',
        topics: ['healthcare'],
        citation: {
          url: 'https://www.xavierbecerra2026.com/',
          source_type: 'campaign_site',
          title: 'Xavier Becerra - Build, Protect, and Lead California',
          raw_excerpt: 'expanded health coverage to more than 24 million Americans',
        },
      },
      {
        text: 'Stood up to drug companies to lower the cost of prescription drugs.',
        stance_summary: 'supports lowering prescription drug costs',
        topics: ['healthcare', 'economy'],
        citation: {
          url: 'https://www.xavierbecerra2026.com/',
          source_type: 'campaign_site',
          title: 'Xavier Becerra - Build, Protect, and Lead California',
          raw_excerpt: "stood up to drug companies to lower the cost of prescriptions",
        },
      },
      {
        text: "Launched a first-in-the-nation free 'Power Hour' program to cut utility bills for working Californians.",
        stance_summary: 'supports utility bill relief',
        topics: ['economy'],
        citation: {
          url: 'https://www.xavierbecerra2026.com/',
          source_type: 'campaign_site',
          title: 'Xavier Becerra - Build, Protect, and Lead California',
          raw_excerpt: "first-in-the-nation free 'Power Hour' to cut utility bills for working Californians",
        },
      },
      {
        text: 'Defended DACA ("Dreamers") from Trump administration termination efforts as California Attorney General.',
        stance_summary: 'supports DACA protections',
        topics: ['immigration'],
        citation: {
          url: 'https://www.xavierbecerra2026.com/',
          source_type: 'campaign_site',
          title: 'Xavier Becerra - Build, Protect, and Lead California',
          raw_excerpt: 'Defended Dreamers from Trump Administration attacks as California\'s Attorney General',
        },
      },
      {
        text: 'Would declare a state of emergency to fund 40,000 units of already-approved affordable housing and push cities to zone more residential land for apartments and condos.',
        stance_summary: 'supports expanding affordable housing supply',
        topics: ['housing', 'homelessness'],
        citation: {
          url: 'https://calmatters.org/california-voter-guide-2026/governor/',
          source_type: 'news',
          title: 'Who are the 2026 California governor candidates?',
          publisher: 'CalMatters',
          raw_excerpt: 'declare a state of emergency to fund 40,000 units of already-approved affordable housing, push cities to zone more residential land for apartments and condos',
        },
      },
      {
        text: 'Filed more than 100 lawsuits against the Trump administration as California Attorney General, including to protect the Affordable Care Act.',
        stance_summary: 'opposes Trump administration policy rollbacks',
        topics: ['healthcare'],
        citation: {
          url: 'https://en.wikipedia.org/wiki/Xavier_Becerra',
          source_type: 'other',
          title: 'Xavier Becerra - Wikipedia',
          raw_excerpt: 'led multi-state litigation to preserve protections for people with pre-existing conditions',
        },
      },
    ],
    policy_items: [
      {
        action_text:
          'As HHS Secretary, implemented the first round of Medicare drug price negotiations under the Inflation Reduction Act, reaching agreement with manufacturers on new, lower prices for the first 10 selected drugs.',
        effect_text:
          'The negotiated prices (38-79% discounts) would have saved $6 billion in net prescription drug costs had they been in effect in 2023; about 9 million Medicare beneficiaries who use these drugs are expected to save an estimated $1.5 billion in out-of-pocket costs in 2026.',
        stance_summary: 'delivered lower prescription drug prices via negotiation',
        topics: ['healthcare', 'economy'],
        date: '2024-08-15',
        citation: {
          url: 'https://www.ascp.com/news/679973/38-79-Off-HHS-Announces-First-Round-of-Negotiated-Medicare-Drug-Prices.htm',
          source_type: 'news',
          title: '38-79% Off? HHS Announces First Round of Negotiated Medicare Drug Prices',
          publisher: 'American Society of Consultant Pharmacists',
          raw_excerpt: 'discounts ranging from 38% to 79%... would have saved $6 billion in net prescription drug costs',
        },
      },
      {
        action_text:
          "As HHS Secretary, oversaw the Office of Refugee Resettlement's handling of unaccompanied migrant children.",
        effect_text:
          "The agency could not locate approximately 85,000 unaccompanied children over a two-year period, and some were found working in illegal jobs.",
        stance_summary: 'oversight gap in unaccompanied minor placement tracking',
        topics: ['immigration', 'safety'],
        date: null,
        citation: {
          url: 'https://en.wikipedia.org/wiki/Xavier_Becerra',
          source_type: 'other',
          title: 'Xavier Becerra - Wikipedia',
          raw_excerpt: 'could not reach about 85,000 children" over two years, with some working in illegal jobs',
        },
      },
    ],
  },
  {
    full_name: 'Steve Hilton',
    party: 'Republican',
    is_incumbent: false,
    current_position_title: 'Former Fox News commentator; former senior adviser to UK Prime Minister David Cameron',
    campaign_site_url: 'https://stevehiltonforgovernor.com/policies',
    history_text:
      'Stephen Glenn Charles Hilton was born August 25, 1969, in London, England, to parents who emigrated from Hungary during the 1956 revolution. He served as director of strategy for UK Prime Minister David Cameron from 2010 to 2012, co-founded the crowdfunding platform Crowdpac (CEO until 2018), and hosted "The Next Revolution" on Fox News from 2017 to 2023. A self-described proponent of "positive populism" and a strong supporter of Donald Trump, Hilton is the Republican nominee for California Governor in the November 2026 general election after advancing from the June 2026 top-two primary.',
    platform_items: [
      {
        text: 'Stop the hidden tax on new homes: cap government fees and regulatory costs on new housing at $50,000.',
        stance_summary: 'supports capping housing development fees',
        topics: ['housing'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'STOP THE HIDDEN TAX ON NEW HOMES: CAP GOVERNMENT FEES AND REGULATORY COSTS AT $50,000',
        },
      },
      {
        text: 'No state income tax on income under $150,000; proposes a flat tax on earnings above that level.',
        stance_summary: 'supports cutting state income tax for middle-income earners',
        topics: ['taxes', 'economy'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'No State Income Tax on Your First $150,000',
        },
      },
      {
        text: 'Build a new California State Police Force focused on public safety.',
        stance_summary: 'supports expanding state-level policing',
        topics: ['safety'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'Build a Real California State Police Force',
        },
      },
      {
        text: 'Crack down on masked criminals as part of a broader public-safety agenda.',
        stance_summary: 'supports tougher criminal enforcement',
        topics: ['safety', 'criminal_justice'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'Crack Down on Masked Criminals',
        },
      },
      {
        text: 'Restore Second Amendment rights in California.',
        stance_summary: 'opposes current state gun restrictions',
        topics: ['safety'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'Restoring Second Amendment Rights in California',
        },
      },
      {
        text: "Fix K-12 public education by focusing on 3rd-grade reading and math proficiency.",
        stance_summary: 'supports early-grade academic proficiency focus',
        topics: ['education'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: "Making California's Schools Work Again: Fix Public Education by 3rd Grade",
        },
      },
      {
        text: 'Cut electricity bills by ending wind and solar farm mandates.',
        stance_summary: 'opposes renewable energy mandates',
        topics: ['environment', 'economy'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: "Cut California's Electricity Bills by Ending Wind and Solar Farm Mandates",
        },
      },
      {
        text: "Cut water bills by ending what he calls 'man-made water scarcity.'",
        stance_summary: 'supports loosening water-use restrictions',
        topics: ['environment'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: "Cut California's Water Bills in Half by Ending Man-Made Water Scarcity",
        },
      },
      {
        text: "Establish a 'Working Class Healthcare Guarantee.'",
        stance_summary: 'supports a working-class healthcare guarantee',
        topics: ['healthcare'],
        citation: {
          url: 'https://stevehiltonforgovernor.com/policies',
          source_type: 'campaign_site',
          title: 'The Policies — Steve Hilton for Governor',
          raw_excerpt: 'THE WORKING CLASS HEALTHCARE GUARANTEE',
        },
      },
    ],
    policy_items: [
      {
        action_text:
          "As director of strategy for UK Prime Minister David Cameron (2010-2012), Hilton was the chief architect of the 'Big Society' policy, which included shifting control of local services like policing to directly elected Police and Crime Commissioners.",
        effect_text:
          "The first Police and Crime Commissioner elections drew record-low turnout (about 15%), and critics said the broader Big Society initiative struggled to survive contact with government and functioned in practice as cover for austerity-driven cuts to welfare services.",
        stance_summary: 'championed devolving government services to local/elected control',
        topics: ['safety', 'criminal_justice'],
        date: '2011-01-01',
        citation: {
          url: 'https://en.wikipedia.org/wiki/Big_Society',
          source_type: 'other',
          title: 'Big Society - Wikipedia',
          raw_excerpt: 'barely survived its first exposure to real time Government... lowest turnout',
        },
      },
    ],
  },
];

async function upsertCitation(client, c) {
  const { rows } = await client.query(
    `insert into citations (url, source_type, title, publisher, raw_excerpt)
     values ($1, $2, $3, $4, $5)
     on conflict (url, raw_excerpt) do update set title = excluded.title
     returning id`,
    [c.url, c.source_type, c.title ?? null, c.publisher ?? null, c.raw_excerpt ?? null]
  );
  return rows[0].id;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const topicIdBySlug = new Map();
  for (const slug of TOPIC_SLUGS) {
    const { rows } = await client.query('select id from topics where slug = $1', [slug]);
    if (!rows[0]) throw new Error(`Topic ${slug} not seeded - run db/seed.js first`);
    topicIdBySlug.set(slug, rows[0].id);
  }

  try {
    await client.query('begin');

    const { rows: posRows } = await client.query(
      `insert into positions (slug, title, level, jurisdiction, election_cycle)
       values ('ca-governor-2026', 'Governor of California', 'state_executive', 'California', '2026')
       on conflict (slug) do update set title = excluded.title
       returning id`
    );
    const positionId = posRows[0].id;

    const { rows: existingCandidates } = await client.query(
      'select id from candidates where position_id = $1',
      [positionId]
    );
    if (existingCandidates.length > 0) {
      await client.query('delete from candidates where position_id = $1', [positionId]);
    }

    for (const candidate of CANDIDATES) {
      const { rows: candRows } = await client.query(
        `insert into candidates (position_id, full_name, party, is_incumbent, current_position_title, campaign_site_url, history_text)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          positionId,
          candidate.full_name,
          candidate.party,
          candidate.is_incumbent,
          candidate.current_position_title,
          candidate.campaign_site_url,
          candidate.history_text,
        ]
      );
      const candidateId = candRows[0].id;
      const candidateTopicIds = new Set();

      for (const [index, item] of candidate.platform_items.entries()) {
        const { rows: itemRows } = await client.query(
          `insert into platform_items (candidate_id, text, stance_summary, sort_order) values ($1, $2, $3, $4) returning id`,
          [candidateId, item.text, item.stance_summary, index]
        );
        const itemId = itemRows[0].id;
        const citationId = await upsertCitation(client, item.citation);
        await client.query(
          'insert into platform_item_citations (platform_item_id, citation_id) values ($1, $2)',
          [itemId, citationId]
        );
        for (const slug of item.topics) {
          const topicId = topicIdBySlug.get(slug);
          candidateTopicIds.add(topicId);
          await client.query(
            'insert into platform_item_topics (platform_item_id, topic_id) values ($1, $2) on conflict do nothing',
            [itemId, topicId]
          );
        }
      }

      for (const [index, item] of candidate.policy_items.entries()) {
        const { rows: itemRows } = await client.query(
          `insert into policy_items (candidate_id, action_text, effect_text, stance_summary, date, sort_order)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [candidateId, item.action_text, item.effect_text, item.stance_summary, item.date, index]
        );
        const itemId = itemRows[0].id;
        const citationId = await upsertCitation(client, item.citation);
        await client.query(
          'insert into policy_item_citations (policy_item_id, citation_id) values ($1, $2)',
          [itemId, citationId]
        );
        for (const slug of item.topics) {
          const topicId = topicIdBySlug.get(slug);
          candidateTopicIds.add(topicId);
          await client.query(
            'insert into policy_item_topics (policy_item_id, topic_id) values ($1, $2) on conflict do nothing',
            [itemId, topicId]
          );
        }
      }

      for (const topicId of candidateTopicIds) {
        await client.query(
          'insert into candidate_topics (candidate_id, topic_id) values ($1, $2) on conflict do nothing',
          [candidateId, topicId]
        );
      }

      console.log(`Loaded ${candidate.full_name}: ${candidate.platform_items.length} platform items, ${candidate.policy_items.length} policy items`);
    }

    await client.query('commit');
    console.log('Ingestion committed.');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
