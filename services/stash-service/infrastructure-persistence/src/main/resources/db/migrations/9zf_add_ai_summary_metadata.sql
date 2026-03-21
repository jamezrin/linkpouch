ALTER TABLE links
    ADD COLUMN ai_summary_model VARCHAR(255),
    ADD COLUMN ai_summary_input_tokens INTEGER,
    ADD COLUMN ai_summary_output_tokens INTEGER,
    ADD COLUMN ai_summary_elapsed_ms INTEGER;
