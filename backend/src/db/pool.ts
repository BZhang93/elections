import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
