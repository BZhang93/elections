import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { buildCandidateDetail, NotFoundError } from '@/lib/serializers/candidateDetail';
import { ContentItems } from '@/components/ContentItems';
import { prisma } from '@/lib/prisma';
import { requestSummary } from '@/app/actions';

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail;
  try {
    detail = await buildCandidateDetail(id, getCurrentUserId());
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const position = await prisma.position.findUniqueOrThrow({ where: { id: detail.position_id } });
  const pendingSummary = await prisma.aiJob.findFirst({ where: { candidateId: detail.id, kind: 'summary', status: 'pending' } });

  return (
    <>
      <p><Link href={`/races/${position.slug}`}>← Back to Race</Link></p>
      <h1>{detail.full_name}</h1>
      <div className="muted">
        {detail.party}
        {detail.current_position_title ? ` · ${detail.current_position_title}` : ''}
        {detail.campaign_site_url ? (
          <> · <a href={detail.campaign_site_url} target="_blank" rel="noopener noreferrer">Campaign Site</a></>
        ) : null}
      </div>
      <p>Alignment With Your Priorities: <span className="score">{detail.alignment_score === null ? '—' : Math.round(detail.alignment_score)}</span></p>

      <section className="card">
        <h3>Summary</h3>
        {detail.ai_summary ? (
          <p>{detail.ai_summary}</p>
        ) : pendingSummary ? (
          <p className="muted">Summary pending.</p>
        ) : (
          <form action={requestSummary}>
            <input type="hidden" name="candidateId" value={detail.id} />
            <p className="muted">No summary yet.</p>
            <button type="submit">Request Summary</button>
          </form>
        )}
      </section>

      <section className="card">
        <h3>Background</h3>
        <p>{detail.history_text ?? <span className="muted">No history recorded.</span>}</p>
      </section>

      <section className="card">
        <h3>Ratings</h3>
        {detail.ratings.rated.length === 0 ? (
          <p className="muted">No stance identified.</p>
        ) : (
          <ul className="plain">
            {detail.ratings.rated.map((r) => (
              <li key={r.slug} className="rating">
                <span className="pill">{r.label}</span>
                <strong>{r.lean === 'mixed' ? 'Mixed' : `Leans: ${r.leanLabel}`}</strong>
                <span className="muted"> · {r.aCount + r.bCount} tagged {r.aCount + r.bCount === 1 ? 'bullet' : 'bullets'}</span>
              </li>
            ))}
          </ul>
        )}
        {detail.ratings.noStanceIdentified.length > 0 && detail.ratings.rated.length > 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No stance identified: {detail.ratings.noStanceIdentified.map((t) => t.label).join(', ')}
          </p>
        ) : null}
      </section>

      {detail.stats.length > 0 ? (
        <section className="card">
          <h3>Stats</h3>
          <ul className="plain">
            {detail.stats.map((st) => (
              <li key={st.id} className="stat">
                {st.topic ? <span className="pill">{st.topic.label}</span> : null}
                {st.summary}
                {st.citations.map((c) => (
                  <a key={c.id} className="citation" href={c.url} target="_blank" rel="noopener noreferrer">
                    [{c.publisher ?? c.title ?? 'source'}]
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h3>Platform</h3>
        <ContentItems items={detail.platform_items} targetType="platform_item" candidateId={detail.id} />
      </section>

      <section className="card">
        <h3>Past Policies and Effects</h3>
        <ContentItems items={detail.policy_items.map((p) => ({ ...p, text: p.action_text }))} targetType="policy_item" candidateId={detail.id} />
      </section>

      <section className="card">
        <h3>Voting History</h3>
        <ContentItems items={detail.voting_history_items.map((v) => ({ ...v, text: v.bill_title }))} targetType="voting_history_item" candidateId={detail.id} />
      </section>

      <section className="card">
        <h3>Fundraising</h3>
        {(() => {
          const totals = detail.fundraising_sources.filter((f) => f.source_type === 'campaign_total');
          const others = detail.fundraising_sources.filter((f) => f.source_type !== 'campaign_total');
          const money = (amount: string) =>
            `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const label = (type: string) =>
            ({ independent_expenditure: 'Independent Expenditure', pac: 'PAC', individual: 'Individual', corporation: 'Corporation', party: 'Party', self: 'Self-Funded', other: 'Other' })[type] ?? type;
          return (
            <>
              {totals.length > 0 ? (
                <ul className="plain" style={{ marginBottom: 12 }}>
                  {totals.map((t) => (
                    <li key={t.id}>
                      <strong>{money(t.amount)}</strong> total raised{t.cycle ? ` (${t.cycle})` : ''}
                      {t.citations.map((c) => (
                        <a key={c.id} className="citation" href={c.url} target="_blank" rel="noopener noreferrer">
                          [{c.publisher ?? c.title ?? 'source'}]
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              ) : null}
              {others.length === 0 ? (
                <p className="muted">No donor or committee data recorded yet.</p>
              ) : (
                <table className="fundraising">
                  <thead>
                    <tr><th>Source</th><th>Type</th><th>Amount</th><th>Sources</th></tr>
                  </thead>
                  <tbody>
                    {others.map((f) => (
                      <tr key={f.id}>
                        <td>{f.source_name}</td>
                        <td>{label(f.source_type)}</td>
                        <td>{money(f.amount)}</td>
                        <td>
                          {f.citations.map((c) => (
                            <a key={c.id} className="citation" href={c.url} target="_blank" rel="noopener noreferrer">
                              [{c.publisher ?? c.title ?? 'source'}]
                            </a>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          );
        })()}
      </section>

      {detail.contrastingStances.length > 0 ? (
        <section className="card">
          <h3>Other Candidates on Your Priority Topics</h3>
          {detail.contrastingStances.map((group) => (
            <div key={group.topic} style={{ marginBottom: 12 }}>
              <span className="pill">{group.topic}</span>
              <ul className="plain">
                {group.items.map((item, i) => (
                  <li key={i}>
                    <Link href={`/candidates/${item.candidateId}`}><strong>{item.candidateName}</strong></Link>: {item.itemText}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
