-- Elections app schema. Applied idempotently by db/migrate.js (CREATE ... IF NOT EXISTS).
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  description text
);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  level text not null check (level in ('state_executive', 'state_legislature', 'us_house', 'us_senate', 'local')),
  jurisdiction text,
  election_date date,
  election_cycle text,
  incumbent_candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  full_name text not null,
  party text not null check (party in ('Democratic', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other')),
  is_incumbent boolean not null default false,
  current_position_title text,
  photo_url text,
  campaign_site_url text,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  ai_summary_source_ids uuid[],
  history_text text,
  status text not null default 'active' check (status in ('active', 'withdrawn', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table positions
    add constraint positions_incumbent_candidate_fk
    foreign key (incumbent_candidate_id) references candidates(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists candidate_topics (
  candidate_id uuid not null references candidates(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (candidate_id, topic_id)
);

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  source_type text not null check (source_type in ('ballotpedia', 'legiscan', 'congress_gov', 'leginfo_ca_gov', 'campaign_site', 'news', 'other')),
  title text,
  publisher text,
  published_date date,
  accessed_at timestamptz not null default now(),
  raw_excerpt text
);
create unique index if not exists citations_url_excerpt_idx on citations (url, coalesce(raw_excerpt, ''));

create table if not exists platform_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  text text not null,
  stance_summary text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists platform_item_topics (
  platform_item_id uuid not null references platform_items(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (platform_item_id, topic_id)
);
create table if not exists platform_item_citations (
  platform_item_id uuid not null references platform_items(id) on delete cascade,
  citation_id uuid not null references citations(id) on delete cascade,
  primary key (platform_item_id, citation_id)
);

create table if not exists policy_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  action_text text not null,
  effect_text text,
  stance_summary text,
  date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists policy_item_topics (
  policy_item_id uuid not null references policy_items(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (policy_item_id, topic_id)
);
create table if not exists policy_item_citations (
  policy_item_id uuid not null references policy_items(id) on delete cascade,
  citation_id uuid not null references citations(id) on delete cascade,
  primary key (policy_item_id, citation_id)
);

create table if not exists voting_history_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  bill_identifier text,
  bill_title text not null,
  vote text check (vote in ('yes', 'no', 'abstain', 'sponsored', 'co-sponsored')),
  summary text,
  date date,
  stance_summary text,
  source_system text check (source_system in ('legiscan', 'congress_gov', 'leginfo_ca_gov')),
  source_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists voting_history_items_source_idx
  on voting_history_items (candidate_id, source_system, source_external_id)
  where source_system is not null and source_external_id is not null;
create table if not exists voting_history_item_topics (
  voting_history_item_id uuid not null references voting_history_items(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (voting_history_item_id, topic_id)
);
create table if not exists voting_history_item_citations (
  voting_history_item_id uuid not null references voting_history_items(id) on delete cascade,
  citation_id uuid not null references citations(id) on delete cascade,
  primary key (voting_history_item_id, citation_id)
);

create table if not exists user_topic_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  priority_weight numeric(3,2) not null default 0.5 check (priority_weight >= 0 and priority_weight <= 1),
  unique (user_id, topic_id)
);

create table if not exists user_stance_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform_item_id uuid references platform_items(id) on delete cascade,
  policy_item_id uuid references policy_items(id) on delete cascade,
  voting_history_item_id uuid references voting_history_items(id) on delete cascade,
  agreement_score int not null check (agreement_score between -2 and 2),
  importance_score int check (importance_score between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_stance_ratings_one_target check (
    (platform_item_id is not null)::int + (policy_item_id is not null)::int + (voting_history_item_id is not null)::int = 1
  )
);
create unique index if not exists user_stance_ratings_platform_idx on user_stance_ratings (user_id, platform_item_id) where platform_item_id is not null;
create unique index if not exists user_stance_ratings_policy_idx on user_stance_ratings (user_id, policy_item_id) where policy_item_id is not null;
create unique index if not exists user_stance_ratings_voting_idx on user_stance_ratings (user_id, voting_history_item_id) where voting_history_item_id is not null;

create table if not exists user_freetext_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  content text not null,
  extracted_topic_ids uuid[],
  extracted_keywords text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_alignment_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  score numeric(5,2) not null,
  computed_at timestamptz not null default now(),
  unique (user_id, candidate_id)
);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  position_id uuid references positions(id) on delete set null,
  source_type text,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  log_summary text
);
