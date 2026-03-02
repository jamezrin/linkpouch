-- V6: Add password protection to stashes
-- Allows stash owners to set an optional passphrase on top of the signed URL

ALTER TABLE stashes ADD COLUMN password_hash TEXT;
