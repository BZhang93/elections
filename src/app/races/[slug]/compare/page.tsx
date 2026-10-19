import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findPositionByIdOrSlug } from '@/lib/findPosition';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { buildCandidateDetail } from '@/lib/serializers/candidateDetail';
import { ContentItems } from '@/components/ContentItems';

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const position = await findPositionByIdOrSlug(slug);
  if (!position) notFound();

  const ids = query.ids ? (Array.isArray(query.ids) ? query.ids : [query.ids]) : [];
  if (ids.length < 2 || ids.length > 5) {
    return (
      <>
        <h1>Compare Candidates</h1>
        <p className="muted">Select between 2 and 5 candidates on the race page.</p>
        <p><Link href={`/races/${slug}`}>← Back to Race</Link></p>
      </>
    );
  }

  const userId = getCurrentUserId();
  const details = await Promise.all(ids.map((id) => buildCandidateDetail(id, userId)));

  return (
    <>
      <p><Link href={`/races/${slug}`}>← Back to Race</Link></p>
      <h1>Compare: {position.title}</h1>
      <div className="columns">
        {details.map((d) => (
          <div key={d.id} className="card">
            <h2><Link href={`/candidates/${d.id}`}>{d.full_name}</Link></h2>
            <div className="muted">{d.party}</div>
            <p>Alignment: <span className="score">{d.alignment_score === null ? '—' : Math.round(d.alignment_score)}</span></p>
            <h3>Background</h3>
            <p>{d.history_text ?? <span className="muted">No history recorded.</span>}</p>
            <h3>Platform</h3>
            <ContentItems items={d.platform_items} />
            <h3>Past Policies</h3>
            <ContentItems items={d.policy_items.map((p) => ({ ...p, text: p.action_text }))} />
          </div>
        ))}
      </div>
    </>
  );
}
