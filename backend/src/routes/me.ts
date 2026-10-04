import { Router } from 'express';
import { pool } from '../db/pool';
import { getCurrentUserId } from '../auth/currentUser';

export const meRouter = Router();

async function invalidateAlignmentCache(userId: string) {
  await pool.query('delete from candidate_alignment_cache where user_id = $1', [userId]);
}

meRouter.get('/topic-priorities', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { rows } = await pool.query('select topic_id, priority_weight from user_topic_priorities where user_id = $1', [userId]);
  res.json(rows);
});

meRouter.put('/topic-priorities', async (req, res) => {
  const userId = getCurrentUserId(req);
  const priorities: Array<{ topic_id: string; priority_weight: number }> = req.body;

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from user_topic_priorities where user_id = $1', [userId]);
    for (const p of priorities) {
      await client.query(
        'insert into user_topic_priorities (user_id, topic_id, priority_weight) values ($1, $2, $3)',
        [userId, p.topic_id, p.priority_weight]
      );
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }

  await invalidateAlignmentCache(userId);
  res.status(204).end();
});

meRouter.get('/stance-ratings', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { positionId } = req.query;

  if (positionId) {
    const { rows } = await pool.query(
      `select r.* from user_stance_ratings r
       left join platform_items pi on pi.id = r.platform_item_id
       left join policy_items pli on pli.id = r.policy_item_id
       left join voting_history_items vi on vi.id = r.voting_history_item_id
       left join candidates c on c.id = coalesce(pi.candidate_id, pli.candidate_id, vi.candidate_id)
       where r.user_id = $1 and c.position_id = $2`,
      [userId, positionId]
    );
    return res.json(rows);
  }

  const { rows } = await pool.query('select * from user_stance_ratings where user_id = $1', [userId]);
  res.json(rows);
});

const TARGET_COLUMN: Record<string, string> = {
  platform_item: 'platform_item_id',
  policy_item: 'policy_item_id',
  voting_history_item: 'voting_history_item_id',
};

meRouter.put('/stance-ratings/:targetType/:targetId', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { targetType, targetId } = req.params;
  const column = TARGET_COLUMN[targetType];
  if (!column) {
    return res.status(400).json({ error: { code: 'invalid_target_type', message: `targetType must be one of ${Object.keys(TARGET_COLUMN).join(', ')}` } });
  }
  const { agreement_score, importance_score } = req.body;

  await pool.query(
    `insert into user_stance_ratings (user_id, ${column}, agreement_score, importance_score)
     values ($1, $2, $3, $4)
     on conflict (user_id, ${column}) do update set agreement_score = excluded.agreement_score, importance_score = excluded.importance_score, updated_at = now()`,
    [userId, targetId, agreement_score, importance_score ?? null]
  );

  await invalidateAlignmentCache(userId);
  res.status(204).end();
});

meRouter.get('/freetext', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { rows } = await pool.query(
    'select * from user_freetext_inputs where user_id = $1 order by updated_at desc limit 1',
    [userId]
  );
  res.json(rows[0] ?? null);
});

meRouter.put('/freetext', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { content } = req.body;

  // v1: naive keyword extraction placeholder. Swap for an LLM extraction call
  // (see ingestion/src/pipeline/aiExtractFreetext.ts) once wired up.
  const extractedKeywords: string[] = content
    .split(/[.,;\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const { rows } = await pool.query(
    `insert into user_freetext_inputs (user_id, content, extracted_keywords)
     values ($1, $2, $3)
     returning *`,
    [userId, content, extractedKeywords]
  );

  await invalidateAlignmentCache(userId);
  res.json(rows[0]);
});
