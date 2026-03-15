export type OAuthProviderName = 'github' | 'google' | 'twitter' | 'discord';

export interface AccountProvider {
  provider: OAuthProviderName;
}

export type StashVisibility = 'SHARED' | 'PRIVATE';

export interface ClaimedStash {
  stashId: string;
  stashName: string;
  visibility: StashVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimedStashPage {
  content: ClaimedStash[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AccountResponse {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  providers: AccountProvider[];
}
