export type OAuthProviderName = 'github' | 'google' | 'twitter' | 'discord';

export interface AccountProvider {
  provider: OAuthProviderName;
}

export type StashVisibility = 'SHARED' | 'PRIVATE';

export interface ClaimedStash {
  stashId: string;
  stashName: string;
  visibility: StashVisibility;
}

export interface AccountResponse {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  providers: AccountProvider[];
  claimedStashes: ClaimedStash[];
}
