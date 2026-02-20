-- V2: Create links table
-- URLs with extracted metadata and full-text search support

CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stash_id UUID NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    favicon_url TEXT,
    page_content TEXT,
    final_url TEXT,
    screenshot_key TEXT,
    screenshot_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_links_stash_id ON links(stash_id);
CREATE INDEX idx_links_created_at ON links(created_at DESC);
