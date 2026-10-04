import { pool } from '../db/pool';
import { computeCandidateAlignment, highlightStatusFor } from '../scoring/alignment';
import { loadCandidateItemsForScoring, loadUserAlignmentInputs } from '../scoring/loadInputs';

async function attachTopicsAndCitations<T extends { id: string }>(
  rows: T[],
  itemTopicsTable: string,
  itemCitationsTable: string,
  itemIdColumn: string
): Promise<Array<T & { topics: any[]; citations: any[] }>> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const { rows: topicRows } = await pool.query(
    `select jt.${itemIdColumn} as item_id, t.id, t.slug, t.label
     from ${itemTopicsTable} jt join topics t on t.id = jt.topic_id
     where jt.${itemIdColumn} = any($1::uuid[])`,
    [ids]
  );
  const { rows: citationRows } = await pool.query(
    `select jc.${itemIdColumn} as item_id, c.id, c.url, c.source_type, c.title, c.publisher, c.published_date, c.raw_excerpt
     from ${itemCitationsTable} jc join citations c on c.id = jc.citation_id
     where jc.${itemIdColumn} = any($1::uuid[])`,
    [ids]
  );

  const topicsByItem = new Map<string, any[]>();
  for (const row of topicRows) {
    const list = topicsByItem.get(row.item_id) ?? [];
    list.push({ id: row.id, slug: row.slug, label: row.label });
    topicsByItem.set(row.item_id, list);
  }
  const citationsByItem = new Map<string, any[]>();
  for (const row of citationRows) {
    const list = citationsByItem.get(row.item_id) ?? [];
    list.push({
      id: row.id,
      url: row.url,
      source_type: row.source_type,
      title: row.title,
      publisher: row.publisher,
      published_date: row.published_date,
      raw_excerpt: row.raw_excerpt,
    });
    citationsByItem.set(row.item_id, list);
  }

  return rows.map((row) => ({
    ...row,
    topics: topicsByItem.get(row.id) ?? [],
    citations: citationsByItem.get(row.id) ?? [],
  }));
}

export async function buildCandidateDetail(candidateId: string, userId: string) {
  const { rows } = await pool.query('select * from candidates where id = $1', [candidateId]);
  const candidate = rows[0];
  if (!candidate) {
    const err: any = new Error('Candidate not found');
    err.status = 404;
    throw err;
  }

  const [platformRaw, policyRaw, votingRaw] = await Promise.all([
    pool.query('select * from platform_items where candidate_id = $1 order by sort_order, created_at', [candidateId]),
    pool.query('select * from policy_items where candidate_id = $1 order by sort_order, created_at', [candidateId]),
    pool.query('select * from voting_history_items where candidate_id = $1 order by date desc nulls last', [candidateId]),
  ]);

  const [platformItems, policyItems, votingItems] = await Promise.all([
    attachTopicsAndCitations(platformRaw.rows, 'platform_item_topics', 'platform_item_citations', 'platform_item_id'),
    attachTopicsAndCitations(policyRaw.rows, 'policy_item_topics', 'policy_item_citations', 'policy_item_id'),
    attachTopicsAndCitations(votingRaw.rows, 'voting_history_item_topics', 'voting_history_item_citations', 'voting_history_item_id'),
  ]);

  const userInputs = await loadUserAlignmentInputs(userId);
  const scoringItems = await loadCandidateItemsForScoring(candidateId);
  const { score_0_100, perItemSignals } = computeCandidateAlignment(scoringItems, userInputs);

  const withHighlight = <T extends { id: string }>(items: T[]) =>
    items.map((item) => {
      const signal = perItemSignals.get(item.id);
      return {
        ...item,
        highlight: {
          status: highlightStatusFor(signal),
          reason: signal?.reason ?? undefined,
        },
      };
    });

  const contrastingStances = await loadContrastingStances(candidate.position_id, candidateId, userInputs.topicPriorities);

  return {
    id: candidate.id,
    position_id: candidate.position_id,
    full_name: candidate.full_name,
    party: candidate.party,
    is_incumbent: candidate.is_incumbent,
    current_position_title: candidate.current_position_title,
    photo_url: candidate.photo_url,
    campaign_site_url: candidate.campaign_site_url,
    ai_summary: candidate.ai_summary,
    history_text: candidate.history_text,
    platform_items: withHighlight(platformItems),
    policy_items: withHighlight(policyItems),
    voting_history_items: withHighlight(votingItems),
    contrastingStances,
    alignment_score: score_0_100,
  };
}

async function loadContrastingStances(positionId: string, candidateId: string, topicPriorities: Map<string, number>) {
  const priorityTopicIds = [...topicPriorities.entries()].filter(([, w]) => w >= 0.6).map(([id]) => id);
  if (priorityTopicIds.length === 0) return [];

  const { rows } = await pool.query(
    `select c.id as candidate_id, c.full_name, pi.text as item_text, t.slug as topic
     from platform_items pi
     join candidates c on c.id = pi.candidate_id
     join platform_item_topics pit on pit.platform_item_id = pi.id
     join topics t on t.id = pit.topic_id
     where c.position_id = $1 and c.id != $2 and pit.topic_id = any($3::uuid[])
     order by c.full_name
     limit 10`,
    [positionId, candidateId, priorityTopicIds]
  );

  return rows.map((row) => ({
    candidateId: row.candidate_id,
    candidateName: row.full_name,
    itemText: row.item_text,
    topic: row.topic,
  }));
}
