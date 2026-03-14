-- Add visibility column to stashes (SHARED = anyone with URL, PRIVATE = claimed account only)
ALTER TABLE stashes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'SHARED';

-- Enforce single-claimer: only one account may claim a stash at a time
ALTER TABLE account_stashes ADD CONSTRAINT unique_stash_claim UNIQUE (stash_id);
