import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { savePreferences } from '@/app/actions';
import { PriorityList } from './PriorityList';

export default async function PreferencesPage() {
  const userId = getCurrentUserId();
  const [topics, priorities, freetext] = await Promise.all([
    prisma.topic.findMany(),
    prisma.userTopicPriority.findMany({ where: { userId }, orderBy: { rank: 'asc' } }),
    prisma.userFreetextInput.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const savedBySlug = new Map(priorities.map((p) => [p.topicId, p]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const ordered = [
    ...priorities.map((p) => topicById.get(p.topicId)).filter((t): t is NonNullable<typeof t> => !!t),
    ...topics.filter((t) => !savedBySlug.has(t.id)),
  ];
  const initial = ordered.map((t) => ({
    slug: t.slug,
    label: t.label,
    description: t.description ?? '',
    sideALabel: t.sideALabel,
    sideBLabel: t.sideBLabel,
    stance: (savedBySlug.get(t.id)?.stance ?? 'none') as 'a' | 'b' | 'none',
  }));

  return (
    <>
      <h1>Your Priorities</h1>
      <p className="muted">
        Drag topics into order, most important first. For each topic, choose which direction you favor. Bullets
        on your top topics count more toward a candidate&apos;s alignment score.
      </p>
      <form action={savePreferences}>
        <div className="card">
          <PriorityList initial={initial} />
        </div>

        <div className="card">
          <label htmlFor="freetext"><strong>What changes would you like to see from elected officials?</strong></label>
          <textarea
            id="freetext"
            name="freetext"
            rows={5}
            defaultValue={freetext?.content ?? ''}
            style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}
          />
          <p className="muted">Comma or period separated phrases work best, e.g. &quot;tough on crime, non-establishment&quot;.</p>
        </div>

        <button type="submit">Save Preferences</button>
      </form>
    </>
  );
}
