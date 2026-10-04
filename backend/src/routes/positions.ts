import { Router } from 'express';
import { pool } from '../db/pool';
import { computeCandidateAlignment } from '../scoring/alignment';
import { getCurrentUserId } from '../auth/currentUser';
import { loadUserAlignmentInputs, loadCandidateItemsForScoring } from '../scoring/loadInputs';
import { buildCandidateDetail } from '../serializers/candidateDetail';

export const positionsRouter = Router();

positionsRouter.get('/', async (req, res) => {
  const { level, cycle } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (level) {
    params.push(level);
    conditions.push(`level = $${params.length}`);
  }
  if (cycle) {
    params.push(cycle);
    conditions.push(`election_cycle = $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const { rows } = await pool.query(
    `select id, slug, title, level, jurisdiction, election_date, election_cycle, incumbent_candidate_id
     from positions ${where} order by title`,
    params
  );
  res.json(rows);
});

positionsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('select * from positions where id::text = $1 or slug = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: { code: 'not_found', message: 'Position not found' } });
  res.json(rows[0]);
});

positionsRouter.get('/:id/candidates', async (req, res) => {
  const position = (await pool.query('select id from positions where id::text = $1 or slug = $1', [req.params.id])).rows[0];
  if (!position) return res.status(404).json({ error: { code: 'not_found', message: 'Position not found' } });

  const { party, topic, sort } = req.query;
  const conditions = ['c.position_id = $1', `c.status = 'active'`];
  const params: any[] = [position.id];
  if (party) {
    params.push(party);
    conditions.push(`c.party = $${params.length}`);
  }
  let topicJoin = '';
  if (topic) {
    const topicSlugs = Array.isArray(topic) ? topic : [topic];
    params.push(topicSlugs);
    topicJoin = `join candidate_topics ct on ct.candidate_id = c.id join topics t on t.id = ct.topic_id and t.slug = any($${params.length}::text[])`;
  }

  const { rows: candidates } = await pool.query(
    `select distinct c.id, c.full_name, c.party, c.current_position_title, c.ai_summary
     from candidates c ${topicJoin}
     where ${conditions.join(' and ')}
     order by c.full_name`,
    params
  );

  const userId = getCurrentUserId(req);
  const userInputs = await loadUserAlignmentInputs(userId);

  const results = await Promise.all(
    candidates.map(async (c) => {
      const items = await loadCandidateItemsForScoring(c.id);
      const { score_0_100 } = computeCandidateAlignment(items, userInputs);
      const { rows: topicRows } = await pool.query(
        `select t.slug from candidate_topics ct join topics t on t.id = ct.topic_id where ct.candidate_id = $1`,
        [c.id]
      );
      return {
        id: c.id,
        full_name: c.full_name,
        party: c.party,
        current_position_title: c.current_position_title,
        ai_summary: c.ai_summary,
        alignment_score: score_0_100,
        topics: topicRows.map((t) => t.slug),
      };
    })
  );

  if (sort === 'alignment') {
    results.sort((a, b) => (b.alignment_score ?? 0) - (a.alignment_score ?? 0));
  }

  res.json(results);
});

positionsRouter.get('/:id/compare', async (req, res) => {
  const position = (await pool.query('select id from positions where id::text = $1 or slug = $1', [req.params.id])).rows[0];
  if (!position) return res.status(404).json({ error: { code: 'not_found', message: 'Position not found' } });

  const candidateIds = String(req.query.candidateIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (candidateIds.length < 2 || candidateIds.length > 5) {
    return res.status(400).json({ error: { code: 'invalid_range', message: 'candidateIds must contain 2-5 ids' } });
  }

  const { rows: owned } = await pool.query(
    'select id from candidates where id = any($1::uuid[]) and position_id = $2',
    [candidateIds, position.id]
  );
  if (owned.length !== candidateIds.length) {
    return res.status(400).json({ error: { code: 'mismatched_position', message: 'All candidates must belong to this position' } });
  }

  const userId = getCurrentUserId(req);
  const details = await Promise.all(candidateIds.map((id) => buildCandidateDetail(id, userId)));
  res.json(details);
});
