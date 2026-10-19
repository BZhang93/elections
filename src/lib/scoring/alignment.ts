export type ScoringItemType = 'platform_item' | 'policy_item' | 'voting_history_item';
export type Side = 'a' | 'b';
export type Stance = Side | 'none';

export interface ScoringTopic {
  id: string;
  slug: string;
  label: string;
  sideALabel: string;
  sideBLabel: string;
  side: Side | null; // which side this bullet takes on this topic
}

export interface ScoringItem {
  id: string;
  type: ScoringItemType;
  text: string;
  stanceSummary: string | null;
  topics: ScoringTopic[];
}

export interface UserRatingInput {
  targetType: ScoringItemType;
  targetId: string;
  agreementScore: number; // -2..2
  importanceScore: number | null; // 0..2
}

export interface UserPriority {
  rank: number; // 1 = most important
  stance: Stance;
  label: string;
  sideALabel: string;
  sideBLabel: string;
}

export interface UserAlignmentInputs {
  priorities: Map<string, UserPriority>; // topic_id -> priority
  rankedTopicCount: number;
  ratings: Map<string, UserRatingInput>; // keyed by `${targetType}:${targetId}`
  freetextKeywords: string[];
}

export type HighlightStatus = 'aligned' | 'opposing' | 'neutral';

export interface ItemSignal {
  signal: -1 | 0 | 1;
  weight: number;
  source: 'user_rated' | 'stance_match' | 'inferred_from_freetext';
  reason: string;
}

export interface AlignmentResult {
  score_0_100: number | null;
  perItemSignals: Map<string, ItemSignal>;
}

const HIGHLIGHT_WEIGHT_THRESHOLD = 0.3;

function ratingKey(targetType: ScoringItemType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

// Rank 1 gets weight 1.0, the lowest-ranked topic gets 1/N.
export function rankWeight(rank: number, rankedTopicCount: number): number {
  return (rankedTopicCount - rank + 1) / rankedTopicCount;
}

function matchesFreetextKeyword(item: ScoringItem, keywords: string[]): string | null {
  const haystack = `${item.text} ${item.stanceSummary ?? ''}`.toLowerCase();
  for (const kw of keywords) {
    if (kw && haystack.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

function sideLabel(priority: UserPriority, side: Side): string {
  return side === 'a' ? priority.sideALabel : priority.sideBLabel;
}

export function computeCandidateAlignment(items: ScoringItem[], inputs: UserAlignmentInputs): AlignmentResult {
  const perItemSignals = new Map<string, ItemSignal>();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of items) {
    // Best-ranked topic on this bullet that the user has a priority for.
    let best: { topic: ScoringTopic; priority: UserPriority } | null = null;
    for (const topic of item.topics) {
      const priority = inputs.priorities.get(topic.id);
      if (priority && (!best || priority.rank < best.priority.rank)) best = { topic, priority };
    }
    const topicWeight = best ? rankWeight(best.priority.rank, inputs.rankedTopicCount) : 0;
    const rating = inputs.ratings.get(ratingKey(item.type, item.id));
    let signal: ItemSignal | null = null;

    if (rating) {
      const weight = rating.importanceScore !== null ? rating.importanceScore / 2 : topicWeight || 0.5;
      const value = rating.agreementScore > 0 ? 1 : rating.agreementScore < 0 ? -1 : 0;
      signal = { signal: value, weight, source: 'user_rated', reason: 'You rated this stance directly.' };
    } else {
      // Stance match: the highest-ranked topic where the bullet takes a side and the user has picked one.
      let stanceMatch: { topic: ScoringTopic; priority: UserPriority } | null = null;
      for (const topic of item.topics) {
        const priority = inputs.priorities.get(topic.id);
        if (!priority || topic.side === null || priority.stance === 'none') continue;
        if (!stanceMatch || priority.rank < stanceMatch.priority.rank) stanceMatch = { topic, priority };
      }
      if (stanceMatch && stanceMatch.topic.side !== null) {
        const { topic, priority } = stanceMatch;
        const agrees = priority.stance === topic.side;
        signal = {
          signal: agrees ? 1 : -1,
          weight: rankWeight(priority.rank, inputs.rankedTopicCount),
          source: 'stance_match',
          reason: `${agrees ? 'Matches' : 'Conflicts with'} your stance on ${priority.label}: ${sideLabel(priority, priority.stance as Side)}`,
        };
      } else if (best) {
        const keyword = matchesFreetextKeyword(item, inputs.freetextKeywords);
        if (keyword) {
          signal = {
            signal: 1,
            weight: topicWeight,
            source: 'inferred_from_freetext',
            reason: `Matches your stated interest: "${keyword}"`,
          };
        }
      }
    }

    if (signal && signal.signal !== 0 && signal.weight > 0) {
      perItemSignals.set(item.id, signal);
      weightedSum += signal.signal * signal.weight;
      totalWeight += signal.weight;
    }
  }

  const score_0_100 = totalWeight === 0 ? null : ((weightedSum / totalWeight + 1) / 2) * 100;
  return { score_0_100, perItemSignals };
}

export function highlightStatusFor(signal: ItemSignal | undefined): HighlightStatus {
  if (!signal || signal.weight < HIGHLIGHT_WEIGHT_THRESHOLD) return 'neutral';
  if (signal.signal > 0) return 'aligned';
  if (signal.signal < 0) return 'opposing';
  return 'neutral';
}
