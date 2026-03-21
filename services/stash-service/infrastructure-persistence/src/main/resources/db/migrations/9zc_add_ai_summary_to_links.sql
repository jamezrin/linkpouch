ALTER TABLE links
    ADD COLUMN ai_summary TEXT,
    ADD COLUMN ai_summary_status TEXT NOT NULL DEFAULT 'SKIPPED';
