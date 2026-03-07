-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Add full-text search vector column with automatic generation
ALTER TABLE links ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(url, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(page_content, '')), 'D')
    ) STORED;
-- GIN index for fast full-text search
CREATE INDEX idx_links_search ON links USING GIN(search_vector);
-- Trigram indexes for fuzzy search fallback
CREATE INDEX idx_links_title_trgm ON links USING GIN (title gin_trgm_ops);
CREATE INDEX idx_links_url_trgm ON links USING GIN (url gin_trgm_ops);
-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Trigger for stashes table
CREATE TRIGGER update_stashes_updated_at
    BEFORE UPDATE ON stashes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Trigger for links table
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
