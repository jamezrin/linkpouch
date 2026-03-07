-- Add position column for manual link ordering
ALTER TABLE links ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
-- Initialise positions from existing created_at order (newest = 0)
UPDATE links l
SET position = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY stash_id ORDER BY created_at DESC) - 1 AS rn
    FROM links
) sub
WHERE l.id = sub.id;
CREATE INDEX idx_links_position ON links(stash_id, position);
