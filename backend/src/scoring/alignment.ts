export type ScoringItemType = 'platform_item' | 'policy_item' | 'voting_history_item';

export interface ScoringItem {
  id: string;
  type: ScoringItemType;
  text: string; // the bullet/stance text used for keyword matching
  stanceSummary: string | null;
  topicIds: string[];
}

export interface UserRatingInput {
  targetType: ScoringItemType;
  targetId: string;
  agreementScore: number; // -2..2
  importanceScore: number | null; // 0..2
}

export interface UserAlignmentInputs {
  topicPriorities: Map<string, number>; // topic_id -> weight 0..1
  ratings: Map<string, UserRatingInput>; // keyed by `${targetType}:${targetId}`
  freetextKeywords: string[];
}

export type HighlightStatus = 'aligned' | 'opposing' | 'neutral';

export interface ItemSignal {
  signal: -1 | 0 | 1;
  weight: number;
  source: 'user_rated' | 'inferred_from_freetext' | 'no_signal';
  reason: string | null;
}

export interface AlignmentResult {
  score_0_100: number | null;
  perItemSignals: Map<string, ItemSignal>;
}

const HIGHLIGHT_WEIGHT_THRESHOLD = 0.3;

function ratingKey(targetType: ScoringItemType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function maxTopicWeight(topicIds: string[], priorities: Map<string, number>): number {
  let max = 0;
  for (const topicId of topicIds) {
    const w = priorities.get(topicId);
    if (w !== undefined && w > max) max = w;
  }
  return max;
}

function matchesFreetextKeyword(item: ScoringItem, keywords: string[]): string | null {
  const haystack = `${item.text} ${item.stanceSummary ?? ''}`.toLowerCase();
  for (const kw of keywords) {
    if (kw && haystack.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

export function computeCandidateAlignment(items: ScoringItem[], inputs: UserAlignmentInputs): AlignmentResult {
  const perItemSignals = new Map<string, ItemSignal>();
  let sum = 0;
  let count = 0;

  for (const item of items) {
    const rating = inputs.ratings.get(ratingKey(item.type, item.id));
    let signal: ItemSignal;

    if (rating) {
      const weight = rating.importanceScore !== null ? rating.importanceScore / 2 : maxTopicWeight(item.topicIds, inputs.topicPriorities) || 0.5;
      const normalizedSignal = rating.agreementScore > 0 ? 1 : rating.agreementScore < 0 ? -1 : 0;
      signal = {
        signal: normalizedSignal,
        weight,
        source: 'user_rated',
        reason: 'You rated this stance directly.',
      };
    } else {
      const weight = maxTopicWeight(item.topicIds, inputs.topicPriorities);
      const matchedKeyword = weight > 0 ? matchesFreetextKeyword(item, inputs.freetextKeywords) : null;
      signal = {
        signal: matchedKeyword ? 1 : 0,
        weight,
        source: matchedKeyword ? 'inferred_from_freetext' : 'no_signal',
        reason: matchedKeyword ? `Matches your stated interest: "${matchedKeyword}"` : null,
      };
    }

    perItemSignals.set(item.id, signal);

    if (signal.weight > 0) {
      sum += signal.signal * signal.weight;
      count += 1;
    }
  }

  const score_0_100 = count === 0 ? null : (((sum / count) + 2) / 4) * 100;
  return { score_0_100, perItemSignals };
}

export function highlightStatusFor(signal: ItemSignal | undefined): HighlightStatus {
  if (!signal || signal.weight < HIGHLIGHT_WEIGHT_THRESHOLD) return 'neutral';
  if (signal.signal > 0) return 'aligned';
  if (signal.signal < 0) return 'opposing';
  return 'neutral';
}
