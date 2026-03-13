CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE account_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE account_stashes (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    stash_id UUID NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (account_id, stash_id)
);

CREATE INDEX idx_account_providers_account_id ON account_providers(account_id);
CREATE INDEX idx_account_stashes_account_id ON account_stashes(account_id);
