-- Collapse to one row per account: keep enabled row, or any row if none enabled
DELETE FROM account_ai_settings
WHERE enabled = false
  AND EXISTS (
      SELECT 1 FROM account_ai_settings b
      WHERE b.account_id = account_ai_settings.account_id AND b.enabled = true
  );

-- For accounts with no enabled row, keep just one (arbitrary) row per account
DELETE FROM account_ai_settings
WHERE id NOT IN (
    SELECT DISTINCT ON (account_id) id
    FROM account_ai_settings
    ORDER BY account_id, created_at DESC
);

-- Drop old per-provider unique constraint, add per-account unique constraint
ALTER TABLE account_ai_settings
    DROP CONSTRAINT account_ai_settings_account_id_provider_key;

ALTER TABLE account_ai_settings
    ADD CONSTRAINT account_ai_settings_account_id_key UNIQUE (account_id);

-- Set provider = 'NONE' for remaining rows that were not enabled (catch-all)
UPDATE account_ai_settings SET provider = 'NONE' WHERE enabled = false;

-- Drop the now-redundant enabled column
ALTER TABLE account_ai_settings DROP COLUMN enabled;

-- Make model nullable (NONE provider has no model)
ALTER TABLE account_ai_settings ALTER COLUMN model DROP NOT NULL;
