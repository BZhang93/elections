export type Party = 'Democratic' | 'Republican' | 'Independent' | 'Green' | 'Libertarian' | 'Other';

export type PositionLevel = 'state_executive' | 'state_legislature' | 'us_house' | 'us_senate' | 'local';

export type SourceType = 'ballotpedia' | 'legiscan' | 'congress_gov' | 'leginfo_ca_gov' | 'campaign_site' | 'news' | 'other';

export interface Topic {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
}

export interface Position {
  id: string;
  slug: string;
  title: string;
  level: PositionLevel;
  jurisdiction?: string | null;
  election_date?: string | null;
  election_cycle?: string | null;
  incumbent_candidate_id?: string | null;
}

export interface Citation {
  id: string;
  url: string;
  source_type: SourceType;
  title?: string | null;
  publisher?: string | null;
  published_date?: string | null;
  raw_excerpt?: string | null;
}

export type HighlightStatus = 'aligned' | 'opposing' | 'neutral';

export interface Highlight {
  status: HighlightStatus;
  reason?: string;
}

export interface ContentItemBase {
  id: string;
  candidate_id: string;
  stance_summary?: string | null;
  topics: Topic[];
  citations: Citation[];
  highlight?: Highlight;
}

export interface PlatformItem extends ContentItemBase {
  text: string;
  sort_order: number;
}

export interface PolicyItem extends ContentItemBase {
  action_text: string;
  effect_text?: string | null;
  date?: string | null;
  sort_order: number;
}

export interface VotingHistoryItem extends ContentItemBase {
  bill_identifier?: string | null;
  bill_title: string;
  vote?: 'yes' | 'no' | 'abstain' | 'sponsored' | 'co-sponsored' | null;
  summary?: string | null;
  date?: string | null;
  source_system?: 'legiscan' | 'congress_gov' | 'leginfo_ca_gov' | null;
}

export interface CandidateListItem {
  id: string;
  full_name: string;
  party: Party;
  current_position_title?: string | null;
  ai_summary?: string | null;
  alignment_score: number | null;
  topics: string[];
}

export interface ContrastingStance {
  candidateId: string;
  candidateName: string;
  itemText: string;
  topic: string;
}

export interface CandidateDetail {
  id: string;
  position_id: string;
  full_name: string;
  party: Party;
  is_incumbent: boolean;
  current_position_title?: string | null;
  photo_url?: string | null;
  campaign_site_url?: string | null;
  ai_summary?: string | null;
  history_text?: string | null;
  platform_items: PlatformItem[];
  policy_items: PolicyItem[];
  voting_history_items: VotingHistoryItem[];
  contrastingStances: ContrastingStance[];
  alignment_score: number | null;
}

export interface TopicPriority {
  topic_id: string;
  priority_weight: number;
}

export type StanceTargetType = 'platform_item' | 'policy_item' | 'voting_history_item';

export interface StanceRating {
  target_type: StanceTargetType;
  target_id: string;
  agreement_score: number;
  importance_score?: number | null;
}
