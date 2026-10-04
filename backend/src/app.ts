import express from 'express';
import cors from 'cors';
import { positionsRouter } from './routes/positions';
import { topicsRouter } from './routes/topics';
import { candidatesRouter } from './routes/candidates';
import { meRouter } from './routes/me';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/positions', positionsRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/me', meRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: err.message ?? 'Internal error' } });
});
