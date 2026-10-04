import { Router } from 'express';
import { getCurrentUserId } from '../auth/currentUser';
import { buildCandidateDetail } from '../serializers/candidateDetail';

export const candidatesRouter = Router();

candidatesRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    const detail = await buildCandidateDetail(req.params.id, userId);
    res.json(detail);
  } catch (err: any) {
    if (err.status === 404) return res.status(404).json({ error: { code: 'not_found', message: err.message } });
    next(err);
  }
});
