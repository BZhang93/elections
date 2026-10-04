import { pool } from '../db/pool';
import { ScoringItem, UserAlignmentInputs, UserRatingInput, ScoringItemType } from './alignment';

export async function loadUserAlignmentInputs(userId: string): Promise<UserAlignmentInputs> {
  const [prioritiesRes, ratingsRes, freetextRes] = await Promise.all([
    pool.query('select topic_id, priority_weight from user_topic_priorities where user_id = $1', [userId]),
    pool.query(
      `select platform_item_id, policy_item_id, voting_history_item_id, agreement_score, importance_score
       from user_stance_ratings where user_id = $1`,
      [userId]
    ),
    pool.query(
      `select extracted_keywords from user_freetext_inputs where user_id = $1 order by updated_at desc limit 1`,
      [userId]
    ),
  ]);

  const topicPriorities = new Map<string, number>();
  for (const row of prioritiesRes.rows) {
    topicPriorities.set(row.topic_id, Number(row.priority_weight));
  }

  const ratings = new Map<string, UserRatingInput>();
  for (const row of ratingsRes.rows) {
    let targetType: ScoringItemType;
    let targetId: string;
    if (row.platform_item_id) {
      targetType = 'platform_item';
      targetId = row.platform_item_id;
    } else if (row.policy_item_id) {
      targetType = 'policy_item';
      targetId = row.policy_item_id;
    } else {
      targetType = 'voting_history_item';
      targetId = row.voting_history_item_id;
    }
    const rating: UserRatingInput = {
      targetType,
      targetId,
      agreementScore: row.agreement_score,
      importanceScore: row.importance_score,
    };
    ratings.set(`${targetType}:${targetId}`, rating);
  }

  const freetextKeywords: string[] = freetextRes.rows[0]?.extracted_keywords ?? [];

  return { topicPriorities, ratings, freetextKeywords };
}

async function fetchTopicIds(table: string, idColumn: string, ids: string[]): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const { rows } = await pool.query(
    `select ${idColumn} as item_id, topic_id from ${table} where ${idColumn} = any($1::uuid[])`,
    [ids]
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.item_id) ?? [];
    list.push(row.topic_id);
    map.set(row.item_id, list);
  }
  return map;
}

export async function loadCandidateItemsForScoring(candidateId: string): Promise<ScoringItem[]> {
  const [platform, policy, voting] = await Promise.all([
    pool.query('select id, text, stance_summary from platform_items where candidate_id = $1', [candidateId]),
    pool.query('select id, action_text, stance_summary from policy_items where candidate_id = $1', [candidateId]),
    pool.query('select id, bill_title, summary, stance_summary from voting_history_items where candidate_id = $1', [candidateId]),
  ]);

  const [platformTopics, policyTopics, votingTopics] = await Promise.all([
    fetchTopicIds('platform_item_topics', 'platform_item_id', platform.rows.map((r) => r.id)),
    fetchTopicIds('policy_item_topics', 'policy_item_id', policy.rows.map((r) => r.id)),
    fetchTopicIds('voting_history_item_topics', 'voting_history_item_id', voting.rows.map((r) => r.id)),
  ]);

  const items: ScoringItem[] = [];
  for (const row of platform.rows) {
    items.push({ id: row.id, type: 'platform_item', text: row.text, stanceSummary: row.stance_summary, topicIds: platformTopics.get(row.id) ?? [] });
  }
  for (const row of policy.rows) {
    items.push({ id: row.id, type: 'policy_item', text: row.action_text, stanceSummary: row.stance_summary, topicIds: policyTopics.get(row.id) ?? [] });
  }
  for (const row of voting.rows) {
    items.push({
      id: row.id,
      type: 'voting_history_item',
      text: `${row.bill_title} ${row.summary ?? ''}`,
      stanceSummary: row.stance_summary,
      topicIds: votingTopics.get(row.id) ?? [],
    });
  }
  return items;
}
