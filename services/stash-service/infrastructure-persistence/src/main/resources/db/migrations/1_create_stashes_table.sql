CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE stashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    secret_key TEXT NOT NULL
);
-- Index for faster lookups by creation date
CREATE INDEX idx_stashes_created_at ON stashes(created_at DESC);
