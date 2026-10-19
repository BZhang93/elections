-- CreateEnum
CREATE TYPE "FundraisingSourceType" AS ENUM ('pac', 'individual', 'corporation', 'party', 'self', 'other');

-- CreateTable
CREATE TABLE "fundraising_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" "FundraisingSourceType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "cycle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundraising_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundraising_source_citations" (
    "fundraising_source_id" UUID NOT NULL,
    "citation_id" UUID NOT NULL,

    CONSTRAINT "fundraising_source_citations_pkey" PRIMARY KEY ("fundraising_source_id","citation_id")
);

-- AddForeignKey
ALTER TABLE "fundraising_sources" ADD CONSTRAINT "fundraising_sources_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_source_citations" ADD CONSTRAINT "fundraising_source_citations_fundraising_source_id_fkey" FOREIGN KEY ("fundraising_source_id") REFERENCES "fundraising_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraising_source_citations" ADD CONSTRAINT "fundraising_source_citations_citation_id_fkey" FOREIGN KEY ("citation_id") REFERENCES "citations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

