export type OAuthProviderName = 'github' | 'google' | 'twitter' | 'discord';

export interface AccountProvider {
  provider: OAuthProviderName;
}

export interface ClaimedStash {
  stashId: string;
  stashName: string;
}

export interface AccountResponse {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  providers: AccountProvider[];
  claimedStashes: ClaimedStash[];
}
