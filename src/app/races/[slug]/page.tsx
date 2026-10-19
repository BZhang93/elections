import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { findPositionByIdOrSlug } from '@/lib/findPosition';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { listCandidatesForPosition } from '@/lib/queries/candidates';

const PARTIES = ['Democratic', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other'];

export default async function RacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ party?: string; topic?: string | string[]; sort?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const position = await findPositionByIdOrSlug(slug);
  if (!position) notFound();

  const topicSlugs = query.topic ? (Array.isArray(query.topic) ? query.topic : [query.topic]) : [];
  const [candidates, topics] = await Promise.all([
    listCandidatesForPosition(position.id, getCurrentUserId(), {
      party: query.party,
      topics: topicSlugs,
      sort: query.sort,
    }),
    prisma.topic.findMany({ orderBy: { label: 'asc' } }),
  ]);

  return (
    <>
      <h1>{position.title}</h1>
      <p className="muted">{position.jurisdiction} · {position.electionCycle}</p>

      <form method="GET" className="filters">
        <fieldset>
          <legend>Party</legend>
          <select name="party" defaultValue={query.party ?? ''}>
            <option value="">Any</option>
            {PARTIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </fieldset>
        <fieldset>
          <legend>Topics</legend>
          {topics.map((t) => (
            <label key={t.id}>
              <input type="checkbox" name="topic" value={t.slug} defaultChecked={topicSlugs.includes(t.slug)} /> {t.label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Sort</legend>
          <select name="sort" defaultValue={query.sort ?? 'name'}>
            <option value="name">Name</option>
            <option value="alignment">Alignment</option>
          </select>
        </fieldset>
        <div>
          <button type="submit">Apply</button>
        </div>
      </form>

      <form method="GET" action={`/races/${position.slug}/compare`}>
        {candidates.length === 0 ? <p className="muted">No candidates match these filters.</p> : null}
        {candidates.map((c) => (
          <div key={c.id} className="card">
            <label style={{ float: 'right' }}>
              <input type="checkbox" name="ids" value={c.id} /> Compare
            </label>
            <h2>
              <Link href={`/candidates/${c.id}`}>{c.full_name}</Link>
            </h2>
            <div className="muted">
              {c.party}
              {c.current_position_title ? ` · ${c.current_position_title}` : ''}
            </div>
            <p>
              {c.ai_summary ?? <span className="muted">Summary not generated yet.</span>}
              {c.ai_summary && c.ai_summary_is_hand_written ? <span className="muted"> (hand-written)</span> : null}
            </p>
            <div>
              {c.topics.map((t) => (
                <span key={t} className="pill">
                  {t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              Alignment: <span className="score">{c.alignment_score === null ? '—' : Math.round(c.alignment_score)}</span>
            </div>
          </div>
        ))}
        <button type="submit">Compare (Up to 5)</button>
      </form>
    </>
  );
}
