import { rateStance } from '@/app/actions';

type Citation = { id: string; url: string; title: string | null; publisher: string | null };
type Highlight = { status: 'aligned' | 'opposing' | 'neutral'; reason?: string };
type Rating = { agreementScore: number; importanceScore: number | null } | null;
type Item = {
  id: string;
  highlight: Highlight;
  citations: Citation[];
  text: string;
  effect_text?: string | null;
  rating?: Rating;
};

const AGREEMENT_LABELS: Array<[number, string]> = [
  [-2, 'Strongly Disagree'],
  [-1, 'Disagree'],
  [0, 'Neutral'],
  [1, 'Agree'],
  [2, 'Strongly Agree'],
];

const IMPORTANCE_LABELS: Array<[number, string]> = [
  [0, 'Low Importance'],
  [1, 'Medium Importance'],
  [2, 'High Importance'],
];

function agreementLabel(score: number) {
  return AGREEMENT_LABELS.find(([v]) => v === score)?.[1] ?? '';
}

export function ContentItems({
  items,
  targetType,
  candidateId,
}: {
  items: Item[];
  targetType?: 'platform_item' | 'policy_item' | 'voting_history_item';
  candidateId?: string;
}) {
  if (items.length === 0) return <p className="muted">Nothing recorded yet.</p>;
  return (
    <ul className="plain">
      {items.map((item) => (
        <li key={item.id} className={`highlight ${item.highlight.status}`} title={item.highlight.reason}>
          {item.text}
          {item.effect_text ? <div className="muted">Effect: {item.effect_text}</div> : null}
          {item.citations.map((c) => (
            <a key={c.id} className="citation" href={c.url} target="_blank" rel="noopener noreferrer">
              [{c.publisher ?? c.title ?? 'source'}]
            </a>
          ))}
          {targetType && candidateId ? (
            <form action={rateStance} style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="hidden" name="targetType" value={targetType} />
              <input type="hidden" name="targetId" value={item.id} />
              <input type="hidden" name="candidateId" value={candidateId} />
              <select name="agreement" defaultValue={item.rating?.agreementScore ?? 0} aria-label="Your agreement">
                {AGREEMENT_LABELS.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <select name="importance" defaultValue={item.rating?.importanceScore ?? 1} aria-label="Importance to you">
                {IMPORTANCE_LABELS.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <button type="submit">{item.rating ? 'Update' : 'Rate'}</button>
              {item.rating ? <span className="muted">Your Rating: {agreementLabel(item.rating.agreementScore)}</span> : null}
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
