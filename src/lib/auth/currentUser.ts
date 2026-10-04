/**
 * Single seam for user identity. v1 has no login UI, so every request is
 * treated as the seeded default user. Swapping in Supabase Auth later means
 * changing only this function (read the session user id instead of the env var).
 */
export function getCurrentUserId(): string {
  const userId = process.env.DEFAULT_USER_ID;
  if (!userId) {
    throw new Error('DEFAULT_USER_ID is not set. Run the seed script and copy the printed id into .env.');
  }
  return userId;
}
