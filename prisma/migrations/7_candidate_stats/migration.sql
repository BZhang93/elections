-- CreateTable
CREATE TABLE "candidate_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "topic_id" UUID,
    "summary" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_stat_citations" (
    "candidate_stat_id" UUID NOT NULL,
    "citation_id" UUID NOT NULL,

    CONSTRAINT "candidate_stat_citations_pkey" PRIMARY KEY ("candidate_stat_id","citation_id")
);

-- AddForeignKey
ALTER TABLE "candidate_stats" ADD CONSTRAINT "candidate_stats_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stats" ADD CONSTRAINT "candidate_stats_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stat_citations" ADD CONSTRAINT "candidate_stat_citations_candidate_stat_id_fkey" FOREIGN KEY ("candidate_stat_id") REFERENCES "candidate_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stat_citations" ADD CONSTRAINT "candidate_stat_citations_citation_id_fkey" FOREIGN KEY ("citation_id") REFERENCES "citations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

