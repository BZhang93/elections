-- Stances move from generic more/less to per-topic sides a/b.
ALTER TYPE "TopicStance" RENAME VALUE 'more' TO 'a';
ALTER TYPE "TopicStance" RENAME VALUE 'less' TO 'b';

CREATE TYPE "TopicSide" AS ENUM ('a', 'b');

ALTER TABLE "topics"
  ADD COLUMN "side_a_label" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "side_b_label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "topics" ALTER COLUMN "side_a_label" DROP DEFAULT, ALTER COLUMN "side_b_label" DROP DEFAULT;

ALTER TABLE "platform_item_topics" ADD COLUMN "side" "TopicSide";
ALTER TABLE "policy_item_topics" ADD COLUMN "side" "TopicSide";
ALTER TABLE "voting_history_item_topics" ADD COLUMN "side" "TopicSide";
