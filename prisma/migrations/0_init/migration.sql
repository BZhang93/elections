-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PositionLevel" AS ENUM ('state_executive', 'state_legislature', 'us_house', 'us_senate', 'local');

-- CreateEnum
CREATE TYPE "Party" AS ENUM ('Democratic', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('active', 'withdrawn', 'disqualified');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ballotpedia', 'legiscan', 'congress_gov', 'leginfo_ca_gov', 'campaign_site', 'news', 'other');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('yes', 'no', 'abstain', 'sponsored', 'co-sponsored');

-- CreateEnum
CREATE TYPE "VotingSourceSystem" AS ENUM ('legiscan', 'congress_gov', 'leginfo_ca_gov');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "PositionLevel" NOT NULL,
    "jurisdiction" TEXT,
    "election_date" DATE,
    "election_cycle" TEXT,
    "incumbent_candidate_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "position_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "party" "Party" NOT NULL,
    "is_incumbent" BOOLEAN NOT NULL DEFAULT false,
    "current_position_title" TEXT,
    "photo_url" TEXT,
    "campaign_site_url" TEXT,
    "ai_summary" TEXT,
    "ai_summary_generated_at" TIMESTAMP(3),
    "ai_summary_source_ids" UUID[],
    "history_text" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_topics" (
    "candidate_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,

    CONSTRAINT "candidate_topics_pkey" PRIMARY KEY ("candidate_id","topic_id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "published_date" DATE,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_excerpt" TEXT,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "stance_summary" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_item_topics" (
    "platform_item_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,

    CONSTRAINT "platform_item_topics_pkey" PRIMARY KEY ("platform_item_id","topic_id")
);

-- CreateTable
CREATE TABLE "platform_item_citations" (
    "platform_item_id" UUID NOT NULL,
    "citation_id" UUID NOT NULL,

    CONSTRAINT "platform_item_citations_pkey" PRIMARY KEY ("platform_item_id","citation_id")
);

-- CreateTable
CREATE TABLE "policy_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "action_text" TEXT NOT NULL,
    "effect_text" TEXT,
    "stance_summary" TEXT,
    "date" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_item_topics" (
    "policy_item_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,

    CONSTRAINT "policy_item_topics_pkey" PRIMARY KEY ("policy_item_id","topic_id")
);

-- CreateTable
CREATE TABLE "policy_item_citations" (
    "policy_item_id" UUID NOT NULL,
    "citation_id" UUID NOT NULL,

    CONSTRAINT "policy_item_citations_pkey" PRIMARY KEY ("policy_item_id","citation_id")
);

-- CreateTable
CREATE TABLE "voting_history_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "bill_identifier" TEXT,
    "bill_title" TEXT NOT NULL,
    "vote" "VoteType",
    "summary" TEXT,
    "date" DATE,
    "stance_summary" TEXT,
    "source_system" "VotingSourceSystem",
    "source_external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voting_history_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_history_item_topics" (
    "voting_history_item_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,

    CONSTRAINT "voting_history_item_topics_pkey" PRIMARY KEY ("voting_history_item_id","topic_id")
);

-- CreateTable
CREATE TABLE "voting_history_item_citations" (
    "voting_history_item_id" UUID NOT NULL,
    "citation_id" UUID NOT NULL,

    CONSTRAINT "voting_history_item_citations_pkey" PRIMARY KEY ("voting_history_item_id","citation_id")
);

-- CreateTable
CREATE TABLE "user_topic_priorities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "priority_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.5,

    CONSTRAINT "user_topic_priorities_pkey" PRIMARY KEY ("id")
);

-- Prisma can't express CHECK constraints in schema.prisma; enforce "exactly
-- one of the three polymorphic targets is set" at the DB level here.
-- CreateTable
CREATE TABLE "user_stance_ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "platform_item_id" UUID,
    "policy_item_id" UUID,
    "voting_history_item_id" UUID,
    "agreement_score" INTEGER NOT NULL,
    "importance_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stance_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_freetext_inputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "extracted_topic_ids" UUID[],
    "extracted_keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_freetext_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_alignment_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_alignment_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "position_id" UUID,
    "source_type" TEXT,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "log_summary" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "positions_slug_key" ON "positions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "citations_url_raw_excerpt_key" ON "citations"("url", "raw_excerpt");

-- CreateIndex
CREATE UNIQUE INDEX "voting_history_items_candidate_id_source_system_source_exte_key" ON "voting_history_items"("candidate_id", "source_system", "source_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_priorities_user_id_topic_id_key" ON "user_topic_priorities"("user_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stance_ratings_user_id_platform_item_id_key" ON "user_stance_ratings"("user_id", "platform_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stance_ratings_user_id_policy_item_id_key" ON "user_stance_ratings"("user_id", "policy_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stance_ratings_user_id_voting_history_item_id_key" ON "user_stance_ratings"("user_id", "voting_history_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_alignment_cache_user_id_candidate_id_key" ON "candidate_alignment_cache"("user_id", "candidate_id");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_topics" ADD CONSTRAINT "candidate_topics_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_topics" ADD CONSTRAINT "candidate_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_items" ADD CONSTRAINT "platform_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_item_topics" ADD CONSTRAINT "platform_item_topics_platform_item_id_fkey" FOREIGN KEY ("platform_item_id") REFERENCES "platform_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_item_topics" ADD CONSTRAINT "platform_item_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_item_citations" ADD CONSTRAINT "platform_item_citations_platform_item_id_fkey" FOREIGN KEY ("platform_item_id") REFERENCES "platform_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_item_citations" ADD CONSTRAINT "platform_item_citations_citation_id_fkey" FOREIGN KEY ("citation_id") REFERENCES "citations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_items" ADD CONSTRAINT "policy_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_item_topics" ADD CONSTRAINT "policy_item_topics_policy_item_id_fkey" FOREIGN KEY ("policy_item_id") REFERENCES "policy_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_item_topics" ADD CONSTRAINT "policy_item_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_item_citations" ADD CONSTRAINT "policy_item_citations_policy_item_id_fkey" FOREIGN KEY ("policy_item_id") REFERENCES "policy_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_item_citations" ADD CONSTRAINT "policy_item_citations_citation_id_fkey" FOREIGN KEY ("citation_id") REFERENCES "citations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_history_items" ADD CONSTRAINT "voting_history_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_history_item_topics" ADD CONSTRAINT "voting_history_item_topics_voting_history_item_id_fkey" FOREIGN KEY ("voting_history_item_id") REFERENCES "voting_history_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_history_item_topics" ADD CONSTRAINT "voting_history_item_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_history_item_citations" ADD CONSTRAINT "voting_history_item_citations_voting_history_item_id_fkey" FOREIGN KEY ("voting_history_item_id") REFERENCES "voting_history_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_history_item_citations" ADD CONSTRAINT "voting_history_item_citations_citation_id_fkey" FOREIGN KEY ("citation_id") REFERENCES "citations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_priorities" ADD CONSTRAINT "user_topic_priorities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_priorities" ADD CONSTRAINT "user_topic_priorities_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stance_ratings" ADD CONSTRAINT "user_stance_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stance_ratings" ADD CONSTRAINT "user_stance_ratings_platform_item_id_fkey" FOREIGN KEY ("platform_item_id") REFERENCES "platform_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stance_ratings" ADD CONSTRAINT "user_stance_ratings_policy_item_id_fkey" FOREIGN KEY ("policy_item_id") REFERENCES "policy_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stance_ratings" ADD CONSTRAINT "user_stance_ratings_voting_history_item_id_fkey" FOREIGN KEY ("voting_history_item_id") REFERENCES "voting_history_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_freetext_inputs" ADD CONSTRAINT "user_freetext_inputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_alignment_cache" ADD CONSTRAINT "candidate_alignment_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_alignment_cache" ADD CONSTRAINT "candidate_alignment_cache_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enforce exactly one polymorphic target on user_stance_ratings.
ALTER TABLE "user_stance_ratings"
  ADD CONSTRAINT "user_stance_ratings_one_target" CHECK (
    (("platform_item_id" IS NOT NULL)::int + ("policy_item_id" IS NOT NULL)::int + ("voting_history_item_id" IS NOT NULL)::int) = 1
  );
