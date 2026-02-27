-- Add indexing status column to links table.
-- Existing rows default to 'PENDING' which is safe — they represent links that existed
-- before the status concept was introduced and may or may not have been indexed.
-- The indexer will set them to INDEXED or FAILED when they are processed.
ALTER TABLE links ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING';
