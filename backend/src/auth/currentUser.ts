import { Request } from 'express';

/**
 * Single seam for user identity. v1 has no login UI, so every request is
 * treated as the seeded default user. Swapping in real auth later means
 * changing only this function.
 */
export function getCurrentUserId(_req: Request): string {
  const userId = process.env.DEFAULT_USER_ID;
  if (!userId) {
    throw new Error('DEFAULT_USER_ID is not set. Run db:seed and copy the printed id into .env.');
  }
  return userId;
}
