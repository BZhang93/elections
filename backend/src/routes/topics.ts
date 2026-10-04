import { Router } from 'express';
import { pool } from '../db/pool';

export const topicsRouter = Router();

topicsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('select id, slug, label, description from topics order by label');
  res.json(rows);
});
