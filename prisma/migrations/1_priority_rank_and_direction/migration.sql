-- CreateEnum
CREATE TYPE "TopicStance" AS ENUM ('more', 'less', 'none');

-- CreateEnum
CREATE TYPE "ItemDirection" AS ENUM ('increase', 'decrease');

-- AlterTable
ALTER TABLE "platform_items" ADD COLUMN     "direction" "ItemDirection";

-- AlterTable
ALTER TABLE "policy_items" ADD COLUMN     "direction" "ItemDirection";

-- AlterTable
ALTER TABLE "user_topic_priorities" DROP COLUMN "priority_weight",
ADD COLUMN     "rank" INTEGER NOT NULL,
ADD COLUMN     "stance" "TopicStance" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "voting_history_items" ADD COLUMN     "direction" "ItemDirection";

