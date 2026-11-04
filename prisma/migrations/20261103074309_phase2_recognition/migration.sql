-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "recognitionMeta" JSONB;
