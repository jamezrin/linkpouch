CREATE TABLE account_proxy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    proxy_country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT account_proxy_settings_account_id_key UNIQUE (account_id)
);

CREATE INDEX idx_account_proxy_settings_account_id ON account_proxy_settings(account_id);
